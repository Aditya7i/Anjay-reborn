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

// --- MODUL KEUANGAN (FINANCIAL MODULE) --

// Expense struct menyimpan rincian satuan pengeluaran
type Expense struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"` // "Kebutuhan" atau "Keinginan"
	Type     string  `json:"type"`     // "Sekali" atau "Rutin"
	Amount   float64 `json:"amount"`
}

// MonthlyRecord struct memegang rekaman bulan terkait
type MonthlyRecord struct {
	MonthName    string    `json:"monthName"`
	Income       float64   `json:"income"`
	Expenses     []Expense `json:"expenses"`
	TotalExpense float64   `json:"totalExpense"`
	Savings      float64   `json:"savings"`
	Grade        string    `json:"grade"`
	Advice       string    `json:"advice"`
}

// State Global Keuangan
var financialMonths = []string{"Bulan 1", "Bulan 2", "Bulan 3", "Bulan 4", "Bulan 5", "Bulan 6"}
var financialRecords = make(map[string]*MonthlyRecord)
var currentMonthIndex = 0

// initFinancialState mempersiapkan data di awal ketika kosong
func initFinancialState() {
	if len(financialRecords) == 0 {
		for _, m := range financialMonths {
			financialRecords[m] = &MonthlyRecord{
				MonthName: m,
				Income:    0,
				Expenses:  make([]Expense, 0),
				Grade:     "-",
				Advice:    "Silakan masukkan data keuangan Anda",
			}
		}
	}
}

// jsFinancialGetState mengembalikan state terbaru ke frontend
func jsFinancialGetState(this js.Value, args []js.Value) interface{} {
	initFinancialState()
	calculateEngine()
	
	var resultList []*MonthlyRecord
	for _, m := range financialMonths {
		resultList = append(resultList, financialRecords[m])
	}
	
	resp := map[string]interface{}{
		"currentMonthIndex": currentMonthIndex,
		"records": resultList,
	}
	res, _ := json.Marshal(resp)
	return string(res)
}

// jsFinancialSetIncome memasukkan nominal pemasukan
func jsFinancialSetIncome(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 { return nil }
	initFinancialState()
	income := args[0].Float()
	activeMonth := financialMonths[currentMonthIndex]
	financialRecords[activeMonth].Income += income
	calculateEngine()
	return jsFinancialGetState(this, nil)
}

// jsFinancialNextMonth menggeser ke bulan selanjutnya
func jsFinancialNextMonth(this js.Value, args []js.Value) interface{} {
	initFinancialState()
	if currentMonthIndex < len(financialMonths)-1 {
		currentMonthIndex++
	}
	calculateEngine()
	return jsFinancialGetState(this, nil)
}

// jsFinancialAddExpense menyimpan pengeluaran, jika rutin direplikasi
func jsFinancialAddExpense(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 { return nil }
	initFinancialState()
	dataStr := args[0].String()
	var newExp Expense
	json.Unmarshal([]byte(dataStr), &newExp)
	
	activeMonth := financialMonths[currentMonthIndex]
	
	if newExp.Type == "Rutin" {
		for i := currentMonthIndex; i < len(financialMonths); i++ {
			m := financialMonths[i]
			financialRecords[m].Expenses = append(financialRecords[m].Expenses, newExp)
		}
	} else {
		financialRecords[activeMonth].Expenses = append(financialRecords[activeMonth].Expenses, newExp)
	}
	
	calculateEngine()
	return jsFinancialGetState(this, nil)
}

// jsFinancialDeleteExpense menghapus rekaman pengeluaran
func jsFinancialDeleteExpense(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 { return nil }
	id := args[0].String()
	
	for i := 0; i < len(financialMonths); i++ {
		m := financialMonths[i]
		newExpList := make([]Expense, 0)
		for _, e := range financialRecords[m].Expenses {
			if e.ID != id {
				newExpList = append(newExpList, e)
			}
		}
		financialRecords[m].Expenses = newExpList
	}
	calculateEngine()
	return jsFinancialGetState(this, nil)
}

// calculateEngine menghitung persentase tabungan, konsistensi skor dan grade 
func calculateEngine() {
	streak := 0
	for _, mName := range financialMonths {
		rec := financialRecords[mName]
		
		totalExp := 0.0
		for _, e := range rec.Expenses {
			totalExp += e.Amount
		}
		rec.TotalExpense = totalExp
		rec.Savings = rec.Income - totalExp
		
		// Status belum ada input
		if rec.Income <= 0 && len(rec.Expenses) == 0 {
			rec.Grade = "-"
			rec.Advice = "Silakan masukkan data keuangan Anda"
			streak = 0
			continue
		}
		
		// Input belum memiliki pemasukan tapi ada pengeluaran
		if rec.Income <= 0 {
			rec.Grade = "D"
			rec.Advice = "Ayo tingkatkan lagi kedisiplinan finansialnya"
			streak = 0
			continue
		}
		
		// 1. Perhitungan Skor Persentase
		savingsPct := (rec.Savings / rec.Income) * 100
		percentageScore := 0
		
		if savingsPct < 25 {
			percentageScore = 20
		} else if savingsPct >= 25 && savingsPct <= 30 {
			percentageScore = 30
		} else if savingsPct > 30 && savingsPct <= 40 {
			percentageScore = 40
		} else if savingsPct > 50 {
			percentageScore = 50
		} else {
			percentageScore = 40 
		}
		
		// 2. Perhitungan Streak (Tabungan > 0 beruntun)
		if rec.Savings > 0 {
			streak++
		} else {
			streak = 0
		}
		
		consistencyScore := 0
		if streak >= 6 {
			consistencyScore = 50
		} else if streak >= 4 {
			consistencyScore = 40
		} else if streak >= 2 {
			consistencyScore = 30
		}
		
		// 3. Kalkulasi Poin Final
		finalScore := percentageScore + consistencyScore
		
		if finalScore <= 40 {
			rec.Grade = "D"
			rec.Advice = "Ayo tingkatkan lagi kedisiplinan finansialnya"
		} else if finalScore <= 60 {
			rec.Grade = "C"
			rec.Advice = "Bagus, lebih di tingkatkan lagi yuk"
		} else if finalScore <= 80 {
			rec.Grade = "B"
			rec.Advice = "Semangat...!!! bulan depan harus grade A"
		} else {
			rec.Grade = "A"
			rec.Advice = "Pertahankan, kamu sudah pandai mengelola keuangan"
		}
	}
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
	js.Global().Set("go_fmg_get_state", js.FuncOf(jsFinancialGetState))
	js.Global().Set("go_fmg_set_income", js.FuncOf(jsFinancialSetIncome))
	js.Global().Set("go_fmg_next_month", js.FuncOf(jsFinancialNextMonth))
	js.Global().Set("go_fmg_add_expense", js.FuncOf(jsFinancialAddExpense))
	js.Global().Set("go_fmg_delete_expense", js.FuncOf(jsFinancialDeleteExpense))

	// Channel block to keep WASM running in background
	<-c
}
