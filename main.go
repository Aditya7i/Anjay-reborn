package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math/rand"
	"strconv"
	"strings"
	"syscall/js"
	"time"
)

// User represents the structure of registred user
type User struct {
	Username string    `json:"username"`
	Email    string    `json:"email"`
	Password string    `json:"password"` // Sha256-hashed pass
	Avatar   string    `json:"avatar"`
	Joined   time.Time `json:"joined"`
}

// LogEntry stores authentication logs
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Event     string `json:"event"`
	Status    string `json:"status"` // "SUCCESS", "FAILED", "BLOCKED"
}

// Global Go In-Memory State
var users = make(map[string]User)
var loginHistory []LogEntry
var blockedList = make(map[string]time.Time)
var wrongAttempts = make(map[string]int)

// Mini-game states
var tttBoard = make([]string, 9)
var tttTurn = "X"
var slidingBoard = []interface{}{1, 2, 3, 4, 5, 6, 7, 8, nil}

func hashPassword(password string) string {
	h := sha256.New()
	h.Write([]byte(password))
	return hex.EncodeToString(h.Sum(nil))
}

// go_auth_register wrapper
func jsRegister(this js.Value, args []js.Value) interface{} {
	if len(args) < 5 {
		return "{\"success\": false, \"message\": \"Argumen tidak lengkap\"}"
	}
	username := args[0].String()
	email := args[1].String()
	password := args[2].String()
	confirmPassword := args[3].String()
	avatar := args[4].String()

	if strings.TrimSpace(username) == "" || strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
		return "{\"success\": false, \"message\": \"Kolom tidak boleh kosong\"}"
	}

	if password != confirmPassword {
		return "{\"success\": false, \"message\": \"Konfirmasi kata sandi tidak cocok\"}"
	}

	if _, exists := users[username]; exists {
		return "{\"success\": false, \"message\": \"Username sudah terdaftar!\"}"
	}

	newUser := User{
		Username: username,
		Email:    email,
		Password: hashPassword(password),
		Avatar:   avatar,
		Joined:   time.Now(),
	}
	users[username] = newUser

	log := LogEntry{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Event:     "Registrasi akun '" + username + "' berhasil",
		Status:    "SUCCESS",
	}
	loginHistory = append(loginHistory, log)

	return "{\"success\": true, \"message\": \"Registrasi Akun '" + username + "' sukses! Silahkan login.\"}"
}

// go_auth_login wrapper
func jsLogin(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return "{\"success\": false, \"message\": \"Masukkan username & password\"}"
	}
	username := args[0].String()
	password := args[1].String()

	// Check if blocked
	if blockTime, ok := blockedList[username]; ok {
		if time.Since(blockTime) < (5 * time.Minute) {
			return "{\"success\": false, \"message\": \"Akun terblokir sementara karena kesalahan beruntun. Silahkan tunggu.\"}"
		}
		delete(blockedList, username)
		wrongAttempts[username] = 0
	}

	user, exists := users[username]
	if !exists {
		log := LogEntry{
			Timestamp: time.Now().Format("2006-01-02 15:04:05"),
			Event:     "Gagal masuk: akun '" + username + "' tidak ditemukan",
			Status:    "FAILED",
		}
		loginHistory = append(loginHistory, log)
		return "{\"success\": false, \"message\": \"Username atau sandi salah!\"}"
	}

	hashedInput := hashPassword(password)
	if user.Password != hashedInput {
		wrongAttempts[username]++
		attempts := wrongAttempts[username]

		log := LogEntry{
			Timestamp: time.Now().Format("2006-01-02 15:04:05"),
			Event:     "Gagal masuk sandi salah untuk '" + username + "' (Percobaan " + strconv.Itoa(attempts) + "/3)",
			Status:    "FAILED",
		}
		loginHistory = append(loginHistory, log)

		if attempts >= 3 {
			blockedList[username] = time.Now()
			logBlocked := LogEntry{
				Timestamp: time.Now().Format("2006-01-02 15:04:05"),
				Event:     "SALAH SANDI 3x! Akses akun '" + username + "' diblokir sementara 5 menit.",
				Status:    "BLOCKED",
			}
			loginHistory = append(loginHistory, logBlocked)
			return "{\"success\": false, \"message\": \"SALAH KATA SANDI 3x! Akses Anda diblokir 5 menit.\"}"
		}

		return "{\"success\": false, \"message\": \"Username atau sandi salah! Sisa percobaan: " + strconv.Itoa(3-attempts) + "\"}"
	}

	// Reset attempts on successful log in
	wrongAttempts[username] = 0

	log := LogEntry{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Event:     "Handshake sukses: " + username + " masuk ke sistem",
		Status:    "SUCCESS",
	}
	loginHistory = append(loginHistory, log)

	userJSON, _ := json.Marshal(user)
	return "{\"success\": true, \"message\": \"Login sukses! Menyambungkan handshake secure...\", \"user\": " + string(userJSON) + "}"
}

// go_get_registered wrapper
func jsGetRegistered(this js.Value, args []js.Value) interface{} {
	reg := make([]map[string]string, 0)
	for _, u := range users {
		reg = append(reg, map[string]string{
			"username": u.Username,
			"avatar":   u.Avatar,
			"joined":   u.Joined.Format("15:04"),
		})
	}
	res, _ := json.Marshal(reg)
	return string(res)
}

// go_get_history wrapper
func jsGetHistory(this js.Value, args []js.Value) interface{} {
	res, _ := json.Marshal(loginHistory)
	return string(res)
}

// go_get_blocked wrapper
func jsGetBlocked(this js.Value, args []js.Value) interface{} {
	blocked := make([]map[string]string, 0)
	for user, blockTime := range blockedList {
		blocked = append(blocked, map[string]string{
			"username":   user,
			"blockTime":  blockTime.Format("15:04:05"),
			"remaining":  strconv.Itoa(int(300 - time.Since(blockTime).Seconds())),
		})
	}
	res, _ := json.Marshal(blocked)
	return string(res)
}

// go_get_calendar wrapper
func jsGetCalendar(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return "{}"
	}
	year := args[0].Int()
	month := args[1].Int()

	monthNames := []string{
		"Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}

	// Compute first day of the month & total days
	t := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	firstDay := int(t.Weekday()) // 0 = Sunday, 1 = Monday ...
	
	// Total days in month
	nextT := t.AddDate(0, 1, 0).Add(-time.Second)
	daysInMonth := nextT.Day()

	weeks := make([][]interface{}, 0)
	currentWeek := make([]interface{}, 7)
	for i := range currentWeek {
		currentWeek[i] = nil
	}

	weekDay := firstDay
	for day := 1; day <= daysInMonth; day++ {
		currentWeek[weekDay] = day
		if weekDay == 6 || day == daysInMonth {
			weeks = append(weeks, currentWeek)
			currentWeek = make([]interface{}, 7)
			for i := range currentWeek {
				currentWeek[i] = nil
			}
			weekDay = 0
		} else {
			weekDay++
		}
	}

	mName := monthNames[(month-1)%12]
	resp := map[string]interface{}{
		"month_name": mName,
		"year":       year,
		"month":      month,
		"days":       weeks,
	}

	res, _ := json.Marshal(resp)
	return string(res)
}

// go_ttt_move wrapper
func jsTTTMove(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return "{}"
	}
	index := args[0].Int()

	if tttBoard[index] == "" {
		tttBoard[index] = tttTurn
		if tttTurn == "X" {
			tttTurn = "O"
		} else {
			tttTurn = "X"
		}
	}

	wins := [][]int{
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8},
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8},
		{0, 4, 8}, {2, 4, 6},
	}

	winner := ""
	for _, w := range wins {
		if tttBoard[w[0]] != "" && tttBoard[w[0]] == tttBoard[w[1]] && tttBoard[w[0]] == tttBoard[w[2]] {
			winner = tttBoard[w[0]]
		}
	}

	hasEmpty := false
	for _, val := range tttBoard {
		if val == "" {
			hasEmpty = true
		}
	}

	if winner == "" && !hasEmpty {
		winner = "Draw"
	}

	resp := map[string]interface{}{
		"board":  tttBoard,
		"turn":   tttTurn,
		"winner": winner,
	}
	res, _ := json.Marshal(resp)
	return string(res)
}

// go_ttt_reset wrapper
func jsTTTReset(this js.Value, args []js.Value) interface{} {
	tttBoard = make([]string, 9)
	tttTurn = "X"
	resp := map[string]interface{}{
		"board":  tttBoard,
		"turn":   tttTurn,
		"winner": "",
	}
	res, _ := json.Marshal(resp)
	return string(res)
}

// go_roll_dice wrapper
func jsRollDice(this js.Value, args []js.Value) interface{} {
	res := rand.Intn(6) + 1
	return res
}

// go_init_memory wrapper
func jsInitMemory(this js.Value, args []js.Value) interface{} {
	size := 16
	if len(args) > 0 {
		size = args[0].Int()
	}
	numPairs := size / 2
	pairs := make([]int, 0, size)
	for i := 0; i < numPairs; i++ {
		pairs = append(pairs, i, i)
	}

	// Shuffle
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(pairs), func(i, j int) {
		pairs[i], pairs[j] = pairs[j], pairs[i]
	})

	cards := make([]map[string]interface{}, size)
	for i, val := range pairs {
		cards[i] = map[string]interface{}{
			"val":     val,
			"flipped": false,
			"matched": false,
		}
	}

	res, _ := json.Marshal(cards)
	return string(res)
}

// Solvability check for 3x3 sliding puzzle
func isPuzzleSolvable(board []interface{}) bool {
	flat := make([]int, 0)
	for _, val := range board {
		if val != nil {
			vInt, ok := val.(int)
			if ok {
				flat = append(flat, vInt)
			} else {
				// float64 from decoding
				vF, ok2 := val.(float64)
				if ok2 {
					flat = append(flat, int(vF))
				}
			}
		}
	}

	inversions := 0
	for i := 0; i < len(flat); i++ {
		for j := i + 1; j < len(flat); j++ {
			if flat[i] > flat[j] {
				inversions++
			}
		}
	}
	return inversions%2 == 0
}

// go_init_sliding wrapper
func jsInitSliding(this js.Value, args []js.Value) interface{} {
	baseNums := []interface{}{1, 2, 3, 4, 5, 6, 7, 8, nil}
	rand.Seed(time.Now().UnixNano())

	for {
		rand.Shuffle(len(baseNums), func(i, j int) {
			baseNums[i], baseNums[j] = baseNums[j], baseNums[i]
		})
		if isPuzzleSolvable(baseNums) {
			break
		}
	}

	slidingBoard = baseNums
	res, _ := json.Marshal(slidingBoard)
	return string(res)
}

// go_move_sliding wrapper
func jsMoveSliding(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return nil
	}
	index := args[0].Int()
	size := 3

	// Find index of nil (empty cell)
	emptyIdx := -1
	for i, v := range slidingBoard {
		if v == nil {
			emptyIdx = i
			break
		}
	}

	if emptyIdx == -1 {
		return nil
	}

	r := index / size
	c := index % size
	er := emptyIdx / size
	ec := emptyIdx % size

	// Move is valid if they are orthogonal adjacent
	diffR := r - er
	diffC := c - ec
	if diffR < 0 {
		diffR = -diffR
	}
	if diffC < 0 {
		diffC = -diffC
	}

	if diffR+diffC == 1 {
		slidingBoard[emptyIdx] = slidingBoard[index]
		slidingBoard[index] = nil

		// Check if solved
		isSolved := true
		for i := 0; i < 8; i++ {
			if slidingBoard[i] == nil {
				isSolved = false
				break
			}
			fVal, okFloat := slidingBoard[i].(float64)
			var vInt int
			if okFloat {
				vInt = int(fVal)
			} else {
				vInt, _ = slidingBoard[i].(int)
			}
			if vInt != i+1 {
				isSolved = false
				break
			}
		}
		if slidingBoard[8] != nil {
			isSolved = false
		}

		resp := map[string]interface{}{
			"board":  slidingBoard,
			"solved": isSolved,
		}
		res, _ := json.Marshal(resp)
		return string(res)
	}

	return nil
}

// go_update_profile wrapper
func jsUpdateProfile(this js.Value, args []js.Value) interface{} {
	if len(args) < 5 {
		return "{\"success\": false, \"message\": \"Kolom tidak lengkap\"}"
	}
	oldUsername := args[0].String()
	newUsername := args[1].String()
	email := args[2].String()
	password := args[3].String()
	avatar := args[4].String()

	user, exists := users[oldUsername]
	if !exists {
		return "{\"success\": false, \"message\": \"Akun lama tidak terdaftar\"}"
	}

	if oldUsername != newUsername {
		if _, existsNew := users[newUsername]; existsNew {
			return "{\"success\": false, \"message\": \"Username baru sudah dipakai!\"}"
		}
		delete(users, oldUsername)
	}

	user.Username = newUsername
	user.Email = email
	user.Avatar = avatar
	if strings.TrimSpace(password) != "" {
		user.Password = hashPassword(password)
	}
	users[newUsername] = user

	log := LogEntry{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Event:     "Modifikasi profil '" + oldUsername + "' ke '" + newUsername + "' berhasil",
		Status:    "SUCCESS",
	}
	loginHistory = append(loginHistory, log)

	userJSON, _ := json.Marshal(user)
	return "{\"success\": true, \"message\": \"Profil berhasil diperbarui!\", \"user\": " + string(userJSON) + "}"
}

func main() {
	// Seed registered Gopher and Admin users
	hPass := hashPassword("password123")
	users["admin"] = User{
		Username: "admin",
		Email:    "admin@gopher.wasm",
		Password: hPass,
		Avatar:   "👾",
		Joined:   time.Now().Add(-24 * time.Hour),
	}
	users["GopherGuest"] = User{
		Username: "GopherGuest",
		Email:    "guest@gopher.wasm",
		Password: hashPassword("guest"),
		Avatar:   "🐹",
		Joined:   time.Now(),
	}

	// Logging bootstrapping
	loginHistory = append(loginHistory, LogEntry{
		Timestamp: time.Now().Add(-24 * time.Hour).Format("2006-01-02 15:04:05"),
		Event:     "Gopher WASM Kernel booted successfully. Mode: Dark Venom (Aesthetic)",
		Status:    "SUCCESS",
	})

	c := make(chan struct{}, 0)

	// Register JS callbacks
	js.Global().Set("go_auth_register", js.FuncOf(jsRegister))
	js.Global().Set("go_auth_login", js.FuncOf(jsLogin))
	js.Global().Set("go_get_registered", js.FuncOf(jsGetRegistered))
	js.Global().Set("go_get_history", js.FuncOf(jsGetHistory))
	js.Global().Set("go_get_blocked", js.FuncOf(jsGetBlocked))
	js.Global().Set("go_get_calendar", js.FuncOf(jsGetCalendar))
	js.Global().Set("go_ttt_move", js.FuncOf(jsTTTMove))
	js.Global().Set("go_ttt_reset", js.FuncOf(jsTTTReset))
	js.Global().Set("go_roll_dice", js.FuncOf(jsRollDice))
	js.Global().Set("go_init_memory", js.FuncOf(jsInitMemory))
	js.Global().Set("go_init_sliding", js.FuncOf(jsInitSliding))
	js.Global().Set("go_move_sliding", js.FuncOf(jsMoveSliding))
	js.Global().Set("go_update_profile", js.FuncOf(jsUpdateProfile))

	// Channel block to keep WASM running in background
	<-c
}
