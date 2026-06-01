/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- GLOBAL TS API BINDINGS SPECIFICATION ---
declare global {
  interface Window {
    go_auth_register?: (u: string, e: string, p: string, cp: string, av: string) => string;
    go_auth_login?: (u: string, p: string) => string;
    go_get_registered?: () => string;
    go_get_history?: () => string;
    go_get_blocked?: () => string;
    go_get_calendar?: (y: number, m: number) => string;
    go_ttt_move?: (idx: number) => string;
    go_ttt_reset?: () => string;
    go_roll_dice?: () => number;
    go_init_memory?: (size?: number) => string;
    go_init_sliding?: () => string;
    go_move_sliding?: (idx: number) => string;
    go_update_profile?: (ou: string, nu: string, e: string, p: string, av: string) => string;
    
    // Toast global triggers
    spawnToast?: (type: 'success' | 'info' | 'warning' | 'error', title: string, text: string) => void;
  }
}

// =========================================================================
// 1. ACOUSTIC SHIELDS & SYNTESIZER AUDIO ALERT (Web Audio API synth)
// =========================================================================
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playAudioAlert(type: 'success' | 'info' | 'warning' | 'error', volumePercent: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((volumePercent / 100) * 0.15, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // SUCCESS: Harmonious double rising tones (Sinusoidal)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5

      osc2.frequency.setValueAtTime(587.33 * 1.25, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(880.00 * 1.25, now + 0.2);

      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      gain2.gain.setValueAtTime(0.5, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.25);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.3);

    } else if (type === 'info') {
      // INFO: Gentle ambient triangle wave
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440.00, now); // A4
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.2); // C#5

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.3);

    } else if (type === 'warning') {
      // WARNING: Modulated square wave vibrant pulse
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220.00, now); // A3
      osc.frequency.setValueAtTime(233.08, now + 0.08); // Bb3
      osc.frequency.setValueAtTime(220.00, now + 0.16);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.26);

    } else if (type === 'error') {
      // ERROR: Sad falling low saw wave sliding pitch
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130.00, now); // C3
      osc.frequency.exponentialRampToValueAtTime(80.00, now + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (e) {
    console.warn("Synthesizer failed to execute sound:", e);
  }
}

// Floating Spawn toast notifications trigger function
function spawnToast(type: 'success' | 'info' | 'warning' | 'error', title: string, text: string) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const volume = Number(localStorage.getItem('chime_volume') || '50');
  playAudioAlert(type, volume);

  const toast = document.createElement('div');
  toast.className = `toast-msg max-w-sm w-96 p-4 rounded-xl shadow-2xl flex gap-3 border pointer-events-auto backdrop-blur-md transition-all`;
  
  let bgBorderColor = 'bg-slate-900/90 border-blue-500/30 text-blue-100';
  let iconHtml = '<i class="fa-solid fa-circle-info text-blue-400 text-lg animate-pulse"></i>';
  
  if (type === 'success') {
    bgBorderColor = 'bg-slate-900/90 border-emerald-500/30 text-emerald-100';
    iconHtml = '<i class="fa-solid fa-circle-check text-emerald-400 text-lg"></i>';
  } else if (type === 'warning') {
    bgBorderColor = 'bg-slate-900/90 border-amber-500/30 text-amber-100';
    iconHtml = '<i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg animate-bounce"></i>';
  } else if (type === 'error') {
    bgBorderColor = 'bg-slate-900/90 border-red-500/30 text-red-100';
    iconHtml = '<i class="fa-solid fa-circle-xmark text-red-400 text-lg"></i>';
  }

  toast.className += ` ${bgBorderColor}`;
  toast.innerHTML = `
    <div class="shrink-0 pt-0.5">${iconHtml}</div>
    <div class="flex-1 min-w-0">
      <h3 class="font-bold text-xs uppercase tracking-wider font-display">${title}</h3>
      <p class="text-[11px] mt-1 text-slate-300 leading-normal">${text}</p>
    </div>
    <button class="shrink-0 text-slate-500 hover:text-white text-xs self-start" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);

  // Auto clean up
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => toast.remove(), 350);
  }, 4500);
}
window.spawnToast = spawnToast;


// =========================================================================
// 2. RESILIENT INTERNAL FALLBACKS SIMULATIONS (If Go WASM is not built yet)
// =========================================================================
interface LocalFileSheet {
  id: string;
  title: string;
  content: string;
  date: string;
  font: string;
  size: string;
}

interface AgendaItem {
  id: string;
  day: string; // "YYYY-MM-DD"
  title: string;
  description: string;
  priority: string;
}

interface UserSession {
  username: string;
  email: string;
  avatar: string;
}

// Mock RAM store mirroring main.go logic state
const _mockUsers: Record<string, any> = {
  'admin': { username: 'admin', email: 'admin@gopher.wasm', avatar: '👾', password: 'hashed_password' },
  'GopherGuest': { username: 'GopherGuest', email: 'guest@gopher.wasm', avatar: '🐹', password: 'hashed_guest' }
};
const _mockLogs: any[] = [
  { timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), event: 'Gopher WASM simulated kernel online.', status: 'SUCCESS' }
];
const _mockBlocked: Record<string, number> = {};
const _mockAttempts: Record<string, number> = {};
let _mockTTTBoard = Array(9).fill("");
let _mockTTTTurn = "X";
let _mockSlidingBoard = [1, 2, 3, 4, 5, 6, 7, 8, null];

function setupWasmSimulationFallbacks() {
  if (!window.go_auth_register) {
    window.go_auth_register = (username, email, password, confirmPassword, avatar) => {
      console.log("%c[GopherWASM Simulated] go_auth_register() call triggered.", "color: #38bdf8; font-weight: bold;");
      if (!username.trim() || !email.trim() || !password.trim()) {
        return JSON.stringify({ success: false, message: "Kolom tidak boleh kosong!" });
      }
      if (password !== confirmPassword) {
        return JSON.stringify({ success: false, message: "Konfirmasi kata sandi tidak cocok!" });
      }
      if (_mockUsers[username]) {
        return JSON.stringify({ success: false, message: "Username sudah terdaftar!" });
      }
      _mockUsers[username] = { username, email, avatar, password };
      
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
      _mockLogs.push({ timestamp: ts, event: `Registrasi '${username}' berhasil (Simulated)`, status: 'SUCCESS' });
      return JSON.stringify({ success: true, message: `Registrasi '${username}' sukses! Silahkan login.` });
    };
  }

  if (!window.go_auth_login) {
    window.go_auth_login = (username, password) => {
      console.log("%c[GopherWASM Simulated] go_auth_login() call triggered.", "color: #38bdf8; font-weight: bold;");
      
      const nowTs = Date.now();
      if (_mockBlocked[username]) {
        if (nowTs - _mockBlocked[username] < 120000) { // 2 mins block
          return JSON.stringify({ success: false, message: "Akun Anda terblokir sementara karena kesalahan beruntun!" });
        }
        delete _mockBlocked[username];
        _mockAttempts[username] = 0;
      }

      const u = _mockUsers[username];
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (!u) {
        _mockLogs.push({ timestamp: ts, event: `Gagal masuk: akun '${username}' tak ditemukan`, status: 'FAILED' });
        return JSON.stringify({ success: false, message: "Username atau sandi salah!" });
      }

      if (username === 'admin' && password !== 'password123') {
        _mockAttempts[username] = (_mockAttempts[username] || 0) + 1;
        _mockLogs.push({ timestamp: ts, event: `Salah sandi untuk '${username}' (Percobaan ${_mockAttempts[username]}/3)`, status: 'FAILED' });
        
        if (_mockAttempts[username] >= 3) {
          _mockBlocked[username] = nowTs;
          _mockLogs.push({ timestamp: ts, event: `SALAH SANDI 3x! Akses akun '${username}' dikunci.`, status: 'BLOCKED' });
          return JSON.stringify({ success: false, message: "SALAH KATA SANDI 3x! Akses Anda diblokir sementara." });
        }
        return JSON.stringify({ success: false, message: `Username atau sandi salah! Sisa percobaan: ${3 - _mockAttempts[username]}` });
      }

      // Success
      _mockAttempts[username] = 0;
      _mockLogs.push({ timestamp: ts, event: `Handshake sukses (simulated): ${username} masuk ke sistem`, status: 'SUCCESS' });
      return JSON.stringify({ success: true, message: "Login sukses!", user: { username: u.username, email: u.email, avatar: u.avatar } });
    };
  }

  if (!window.go_get_registered) {
    window.go_get_registered = () => {
      const arr = Object.values(_mockUsers).map(u => ({ username: u.username, avatar: u.avatar, joined: '15:04' }));
      return JSON.stringify(arr);
    };
  }

  if (!window.go_get_history) {
    window.go_get_history = () => JSON.stringify(_mockLogs);
  }

  if (!window.go_get_blocked) {
    window.go_get_blocked = () => {
      const arr = Object.keys(_mockBlocked).map(user => ({
        username: user,
        blockTime: '15:04:05',
        remaining: Math.max(0, Math.floor((120000 - (Date.now() - _mockBlocked[user])) / 1000)).toString()
      }));
      return JSON.stringify(arr);
    };
  }

  if (!window.go_get_calendar) {
    window.go_get_calendar = (year, month) => {
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      const firstDay = new Date(year, month - 1, 1).getDay();
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const weeks: (number | null)[][] = [];
      let currentWeek: (number | null)[] = Array(7).fill(null);
      
      let weekDay = firstDay;
      for (let day = 1; day <= daysInMonth; day++) {
        currentWeek[weekDay] = day;
        if (weekDay === 6 || day === daysInMonth) {
          weeks.push(currentWeek);
          currentWeek = Array(7).fill(null);
          weekDay = 0;
        } else {
          weekDay++;
        }
      }

      return JSON.stringify({
        month_name: monthNames[month - 1],
        year,
        month,
        days: weeks
      });
    };
  }

  if (!window.go_ttt_move) {
    window.go_ttt_move = (index) => {
      if (_mockTTTBoard[index] === "") {
        _mockTTTBoard[index] = _mockTTTTurn;
        _mockTTTTurn = _mockTTTTurn === "X" ? "O" : "X";
      }
      const wins = [
        [0,1,2], [3,4,5], [6,7,8], 
        [0,3,6], [1,4,7], [2,5,8], 
        [0,4,8], [2,4,6]
      ];
      let winner = "";
      for (const w of wins) {
        if (_mockTTTBoard[w[0]] !== "" && _mockTTTBoard[w[0]] === _mockTTTBoard[w[1]] && _mockTTTBoard[w[0]] === _mockTTTBoard[w[2]]) {
          winner = _mockTTTBoard[w[0]];
        }
      }
      if (winner === "" && !_mockTTTBoard.includes("")) {
        winner = "Draw";
      }
      return JSON.stringify({ board: _mockTTTBoard, turn: _mockTTTTurn, winner });
    };
  }

  if (!window.go_ttt_reset) {
    window.go_ttt_reset = () => {
      _mockTTTBoard = Array(9).fill("");
      _mockTTTTurn = "X";
      return JSON.stringify({ board: _mockTTTBoard, turn: _mockTTTTurn, winner: "" });
    };
  }

  if (!window.go_roll_dice) {
    window.go_roll_dice = () => Math.floor(Math.random() * 6) + 1;
  }

  if (!window.go_init_memory) {
    window.go_init_memory = (size = 16) => {
      const numPairs = size / 2;
      const pairs: number[] = [];
      for (let i = 0; i < numPairs; i++) {
        pairs.push(i, i);
      }
      for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = pairs[i];
        pairs[i] = pairs[j];
        pairs[j] = temp;
      }
      return JSON.stringify(pairs.map(val => ({ val, flipped: false, matched: false })));
    };
  }

  if (!window.go_init_sliding) {
    window.go_init_sliding = () => {
      _mockSlidingBoard = [1, 2, 3, 4, 5, 8, 7, 6, null]; // Solvability simulated layout representation
      return JSON.stringify(_mockSlidingBoard);
    };
  }

  if (!window.go_move_sliding) {
    window.go_move_sliding = (index) => {
      const size = 3;
      const emptyIdx = _mockSlidingBoard.indexOf(null);
      const r = Math.floor(index / size);
      const c = index % size;
      const er = Math.floor(emptyIdx / size);
      const ec = emptyIdx % size;
      if (Math.abs(r - er) + Math.abs(c - ec) === 1) {
        _mockSlidingBoard[emptyIdx] = _mockSlidingBoard[index];
        _mockSlidingBoard[index] = null;
        
        let solved = true;
        for (let i = 0; i < 8; i++) {
          if (_mockSlidingBoard[i] !== i + 1) solved = false;
        }
        if (_mockSlidingBoard[8] !== null) solved = false;

        return JSON.stringify({ board: _mockSlidingBoard, solved });
      }
      return "";
    };
  }

  if (!window.go_update_profile) {
    window.go_update_profile = (oldUsername, newUsername, email, password, avatar) => {
      const u = _mockUsers[oldUsername];
      if (!u) return JSON.stringify({ success: false, message: "Username lama tak terdaftar!" });

      if (oldUsername !== newUsername && _mockUsers[newUsername]) {
        return JSON.stringify({ success: false, message: "Username baru telah dipakai!" });
      }

      delete _mockUsers[oldUsername];
      _mockUsers[newUsername] = {
        username: newUsername,
        email,
        avatar,
        password: password.trim() ? password : u.password
      };

      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
      _mockLogs.push({ timestamp: ts, event: `Update profile '${oldUsername}' -> '${newUsername}'`, status: 'SUCCESS' });
      return JSON.stringify({ success: true, message: "Profil berhasil diperbarui!", user: { username: newUsername, email, avatar } });
    };
  }
}

// Invoke the setup immediately
setupWasmSimulationFallbacks();


// =========================================================================
// 3. CORE FRONT-END CONTROLLER ENGINE (VANILLA TS)
// =========================================================================

// Global reactive states
let session: UserSession | null = null;
let currentTab: string = 'panel-dashboard';
let uptimeCounter = 0;

// Calendar active dates
let viewDate = new Date();
let selectedDay: string | null = null;
let agendasStore: AgendaItem[] = [];
let prioritySelected: string = 'low';

// Diary editor states
let diarySheets: LocalFileSheet[] = [];
let activeEditDiaryId: string | null = null;
let diaryPaperStyleState: string = 'paper-ruled';
let fontPixelSize: number = 14;

// Game variables
let memoryCards: any[] = [];
let memoryFlipped: number[] = [];
let memoryMatchedCount = 0;
let memoryScore = 0;

interface EmbeddedTrack {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  coverPreset: string; // 'g-rose', 'g-emerald', 'g-cyber', 'g-matrix'
  isProcedural: boolean;
  audioBlobUrl?: string;
  filename?: string;
}

const DEFAULT_LYRICS_1 = `[00:00.00] (Instrumental Intro - Kehangatan Gelombang Retro)
[00:05.00] Lampu neon berkelip lambat di ujung malam
[00:10.00] Kode tumpuk beradu dalam tenang dan kelam
[00:15.00] Kompilasi Go mengalir lewat jalur memori
[00:20.00] Menyimpan seluruh rasa yang singgah hari ini
[00:25.00] Oooh, simfoni biner mulai bernyanyi
[00:30.00] Menuntun larik demi larik hingga pagi menjelang
[00:36.00] Detik jam dinding berdetak tanpa henti
[00:41.00] Jurnal lo-fi ini kan ku simpan abadi
[00:47.00] (Instrumental Outro - Fade out ke hening)`;

const DEFAULT_LYRICS_2 = `[00:00.00] (Intro - Angin sepoi instrumentasi synthesizer, 88bpm)
[00:08.00] Derau angin malam menyapa sunyi kamar ini
[00:14.00] Layar biru menyala memantulkan mimpi-mimpi
[00:20.00] Baris string lirik menari gemulai di sunyinya hati
[00:26.00] Berharap semua rindu kan terbebas esok pagi
[00:32.00] Kita hanyalah rangkaian node dalam luas semesta
[00:38.00] Mencari frekuensi yang selaras selamanya
[00:44.00] (Instrumental Melodi - Transisi lembut)`;

const DEFAULT_LYRICS_3 = `[00:00.00] (Sintesis kosmik - Keheningan galaksi)
[00:06.00] Berjalan di antara bungkusan paket data
[00:11.00] Melayang tanpa bobot bersama lirik lofi
[00:17.00] Detak drum menuntun hati menyeka air mata
[00:22.00] Di bawah langit senja digital yang abadi
[00:28.00] Selesaikan kompilasi, raih kebahagiaan sejati
[00:34.00] (Tuning frekuensi - Keluar dari orbit)`;

const seededDefaultTracks: EmbeddedTrack[] = [
  {
    id: 'lofi-track-1',
    title: 'Resonansi Logbook WebAssembly',
    artist: 'The Gopher Loops',
    lyrics: DEFAULT_LYRICS_1,
    coverPreset: 'g-cyber',
    isProcedural: true
  },
  {
    id: 'lofi-track-2',
    title: 'Hening Sandi Malam',
    artist: 'Neon Cyber',
    lyrics: DEFAULT_LYRICS_2,
    coverPreset: 'g-rose',
    isProcedural: true
  },
  {
    id: 'lofi-track-3',
    title: 'Langkah Kosmik',
    artist: 'Vibe Gopher',
    lyrics: DEFAULT_LYRICS_3,
    coverPreset: 'g-emerald',
    isProcedural: true
  }
];

// Continuous audio states
const bgAudioNode = new Audio();
let activeTracksList: EmbeddedTrack[] = [...seededDefaultTracks];
let musicPlayingTrackId: string | null = null;
let musicPlayingState = false;
let currentSimulatedTime = 0;
let simulatedDuration = 180;
let currentParsedLyrics: any[] = [];
let simulatedPlaybackTimer: any = null;
let selectedAddCover = 'g-rose';
let isShuffleMode = false;
let isRepeatMode = false;

document.addEventListener('DOMContentLoaded', () => {
  // Setup standard clock uptime loops
  startDashboardChronosTicker();
  initializeStorageAndCache();
  registerDOMEventHandlers();
  drawWeeklyTasksChart();
  initializeTugasFeatures();

  // Initial active track visuals and queue lists
  renderActivePlayerVisuals();
  renderMainPlaylistDomQueue();
});

// Load variables from local caches
function initializeStorageAndCache() {
  const cachedSess = localStorage.getItem('user_session');
  if (cachedSess) {
    session = JSON.parse(cachedSess);
    setDashboardSessionActive(session!);
  }

  // Chime Speaker variables load
  const chimeVol = localStorage.getItem('chime_volume') || '50';
  const chimeVolSlider = document.getElementById('chime-volume-slider') as HTMLInputElement;
  if (chimeVolSlider) chimeVolSlider.value = chimeVol;
  
  const lblChimeVol = document.getElementById('label-speaker-volume');
  if (lblChimeVol) lblChimeVol.textContent = `${chimeVol}%`;

  // Theme Presets and custom settings load
  const savedPreset = localStorage.getItem('ambient_theme_preset') || 'theme-dk-classic';
  const sliderG = document.getElementById('slider-glow-intensity') as HTMLInputElement;
  const glowInt = localStorage.getItem('neon_glow_intensity') || '45';
  if (sliderG) sliderG.value = glowInt;

  applyThemePreset(savedPreset, true);

  // Calendar agenda items loading
  agendasStore = JSON.parse(localStorage.getItem('agendas_store') || '[]');

  // Diary items load
  diarySheets = JSON.parse(localStorage.getItem('diary_sheets') || '[]');
  renderDiarySheetsHistory();

  // Load custom music tracks or fallback to default
  const savedTracks = localStorage.getItem('custom_tracks_metadata');
  if (savedTracks) {
    try {
      const parsed = JSON.parse(savedTracks);
      activeTracksList = [...seededDefaultTracks, ...parsed];
    } catch (e) {
      activeTracksList = [...seededDefaultTracks];
    }
  } else {
    activeTracksList = [...seededDefaultTracks];
  }

  // Initialize TicTacToe
  resetTicTacToeGame();
}

function startDashboardChronosTicker() {
  // Live clocks update every 1 second
  setInterval(() => {
    const clockEl = document.getElementById('dashboard-clock');
    if (clockEl) {
      clockEl.textContent = new Date().toUTCString().substring(17, 25);
    }

    uptimeCounter++;
    const uptimeEl = document.getElementById('val-uptime');
    if (uptimeEl) {
      uptimeEl.textContent = `${uptimeCounter}s`;
    }

    // Dynamic fake thread usage fluctuating
    const threadEl = document.getElementById('val-usage-percentage');
    if (threadEl) {
      const base = 12 + Math.floor(Math.sin(uptimeCounter * 0.1) * 3) + (Math.random() > 0.8 ? 5 : 0);
      threadEl.textContent = `${base.toFixed(1)}%`;
    }
  }, 1000);
}

function applyInteractiveCSSVariables(primary: string, secondary: string, intensity: number) {
  const root = document.documentElement;
  const opacityHex = Math.floor((intensity / 100) * 255).toString(16).padStart(2, '0');
  
  root.style.setProperty('--neon-primary', primary);
  root.style.setProperty('--neon-primary-glow', `${primary}${opacityHex}`);
  
  root.style.setProperty('--neon-secondary', secondary);
  root.style.setProperty('--neon-secondary-glow', `${secondary}${opacityHex}`);

  // Save state
  localStorage.setItem('neon_primary', primary);
  localStorage.setItem('neon_secondary', secondary);
  localStorage.setItem('neon_glow_intensity', intensity.toString());

  const labelInt = document.getElementById('label-glow-intensity');
  if (labelInt) labelInt.textContent = `${intensity}%`;
}

function applyThemePreset(themeId: string, initLoad: boolean = false) {
  const body = document.body;
  // Remove any pre-existing theme- classes on body dynamically
  body.className.split(' ').forEach(cls => {
    if (cls.startsWith('theme-')) {
      body.classList.remove(cls);
    }
  });
  body.classList.add(themeId);
  
  let primary = '#3b82f6';
  let secondary = '#10b981';
  
  if (themeId === 'theme-dk-classic') {
    primary = '#3b82f6';
    secondary = '#8b5cf6';
  } else if (themeId === 'theme-dk-emerald') {
    primary = '#10b981';
    secondary = '#06b6d4';
  } else if (themeId === 'theme-dk-rosered') {
    primary = '#f43f5e';
    secondary = '#fb7185';
  } else if (themeId === 'theme-lt-sakura') {
    primary = '#f43f5e';
    secondary = '#fb923c';
  } else if (themeId === 'theme-lt-nordic') {
    primary = '#0ea5e9';
    secondary = '#14b8a6';
  } else if (themeId === 'theme-lt-rosered') {
    primary = '#e11d48';
    secondary = '#f43f5e';
  }

  if (initLoad) {
    primary = localStorage.getItem('neon_primary') || primary;
    secondary = localStorage.getItem('neon_secondary') || secondary;
  }
  
  const pickerP = document.getElementById('set-color-primary') as HTMLInputElement;
  const pickerS = document.getElementById('set-color-secondary') as HTMLInputElement;
  if (pickerP) pickerP.value = primary;
  if (pickerS) pickerS.value = secondary;
  
  const slideGlow = document.getElementById('slider-glow-intensity') as HTMLInputElement;
  const valGlow = slideGlow ? Number(slideGlow.value) : 45;
  applyInteractiveCSSVariables(primary, secondary, valGlow);
  
  localStorage.setItem('ambient_theme_preset', themeId);
  
  document.querySelectorAll('.theme-preset-card').forEach(btn => {
    const preset = btn.getAttribute('data-preset');
    if (preset === themeId) {
      btn.classList.add('border-blue-500', 'ring-2', 'ring-blue-500/20');
      btn.classList.remove('border-white/10', 'border-slate-200');
    } else {
      btn.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/20');
      if (preset?.startsWith('theme-lt')) {
        btn.classList.add('border-slate-200');
      } else {
        btn.classList.add('border-white/10');
      }
    }
  });
}


// =========================================================================
// 4. CHIME OPTIONS & HANDSHAKE FLOWS UI EVENT ROUTER
// =========================================================================
function setDashboardSessionActive(user: UserSession) {
  // Hide Auth Page, Open dashboard viewport
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('main-dashboard')?.classList.remove('hidden');

  // Update user visual layout tags
  const avatarEl = document.getElementById('user-profile-avatar');
  const nameEl = document.getElementById('user-profile-name');
  const subEl = document.getElementById('user-profile-sub');

  if (avatarEl) avatarEl.textContent = user.avatar;
  if (nameEl) nameEl.textContent = user.username;
  
  if (subEl) {
    if (user.username === 'GopherGuest') {
      subEl.innerHTML = '● Tamu (Guest Mode)';
      subEl.className = 'text-[9px] font-mono text-amber-500 capitalize tracking-wider font-semibold';
      document.getElementById('calendar-guest-warning')?.classList.remove('hidden');
    } else {
      subEl.innerHTML = '● Terdaftar (Go-RAM Auth)';
      subEl.className = 'text-[9px] font-mono text-emerald-400 capitalize tracking-wider font-semibold';
      document.getElementById('calendar-guest-warning')?.classList.add('hidden');
    }
  }

  // Preset Settings Form values
  const inputU = document.getElementById('update-username') as HTMLInputElement;
  const inputE = document.getElementById('update-email') as HTMLInputElement;
  const selectA = document.getElementById('update-avatar-select') as HTMLSelectElement;

  if (inputU) inputU.value = user.username;
  if (inputE) inputE.value = user.email;
  if (selectA) selectA.value = user.avatar;

  // Refresh Registered Users visual numbers count
  updateRegisteredUsersCount();
  renderSecurityTableLogs();
  
  // Setup Calendar Month initially
  renderCalendarGrid();
}

function updateRegisteredUsersCount() {
  const usersStr = window.go_get_registered ? window.go_get_registered() : '[]';
  const records = JSON.parse(usersStr);

  const statEl = document.getElementById('stat-registered-users');
  if (statEl) statEl.textContent = `${records.length} Pengguna`;
}

function renderSecurityTableLogs() {
  const logsStr = window.go_get_history ? window.go_get_history() : '[]';
  const logs = JSON.parse(logsStr).slice(-6).reverse(); // latest 6 events

  const tbody = document.getElementById('table-logs-tbody');
  if (tbody) {
    tbody.innerHTML = logs.map((l: any) => {
      let badgeClass = 'text-blue-400';
      if (l.status === 'FAILED') badgeClass = 'text-amber-500';
      if (l.status === 'BLOCKED') badgeClass = 'text-red-500';

      return `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
          <td class="py-3 px-4">${l.timestamp}</td>
          <td class="py-3 px-4 text-slate-200">${l.event}</td>
          <td class="py-3 px-4 font-bold ${badgeClass}">${l.status}</td>
        </tr>
      `;
    }).join('');
  }
}

function registerDOMEventHandlers() {
  // --- AUTH CARD INTERCONNECTIONS ---
  const authLabelLogin = document.getElementById('tab-login');
  const authLabelReg = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formReg = document.getElementById('form-register');

  authLabelLogin?.addEventListener('click', () => {
    authLabelLogin.className = 'text-lg font-display font-medium text-blue-400 border-b-2 border-blue-400 pb-1 font-bold';
    authLabelReg?.setAttribute('class', 'text-lg font-display font-medium text-slate-400 border-b-2 border-transparent pb-1 hover:text-slate-200 transition-all');
    formLogin?.classList.remove('hidden');
    formReg?.classList.add('hidden');
  });

  authLabelReg?.addEventListener('click', () => {
    authLabelReg.className = 'text-lg font-display font-medium text-blue-400 border-b-2 border-blue-400 pb-1 font-bold';
    authLabelLogin?.setAttribute('class', 'text-lg font-display font-medium text-slate-400 border-b-2 border-transparent pb-1 hover:text-slate-200 transition-all');
    formReg?.classList.remove('hidden');
    formLogin?.classList.add('hidden');
  });

  // Avatar select inside Registration form
  const avatarOpts = document.querySelectorAll('.avatar-option');
  let selectedAvatarInForm = '🐹';
  
  avatarOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      avatarOpts.forEach(x => x.setAttribute('class', 'avatar-option py-2 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-2xl hover:border-blue-400/40'));
      btn.setAttribute('class', 'avatar-option py-2 rounded-xl bg-slate-950 border border-blue-400/50 flex items-center justify-center text-2xl hover:border-blue-400/50 selected');
      selectedAvatarInForm = btn.getAttribute('data-avatar') || '🐹';
      
      const frontAv = document.getElementById('auth-avatar-display');
      if (frontAv) frontAv.textContent = selectedAvatarInForm;
    });
  });

  // Telemetry toggler on Auth Page (Left corner Menu)
  const leftFrontSegment = document.getElementById('auth-left-front');
  const leftBackSegment = document.getElementById('auth-left-back');
  const btnToggleTele = document.getElementById('btn-toggle-telemetry');
  const btnToggleTeleBack = document.getElementById('btn-toggle-telemetry-back');

  function renderTelemetryData() {
    const listUsers = document.getElementById('telemetry-users-list');
    const listBlocked = document.getElementById('telemetry-block-list');
    const logsConsole = document.getElementById('telemetry-logs-list');

    if (listUsers && window.go_get_registered) {
      const users: any[] = JSON.parse(window.go_get_registered());
      listUsers.innerHTML = users.map(u => `
        <div class="flex items-center gap-1.5 py-0.5 border-b border-white/5">
          <span>${u.avatar}</span>
          <span class="text-white font-bold">${u.username}</span>
          <span class="text-[9px] text-slate-500 ml-auto">${u.joined}</span>
        </div>
      `).join('');
    }

    if (listBlocked && window.go_get_blocked) {
      const blocked: any[] = JSON.parse(window.go_get_blocked());
      if (blocked.length === 0) {
        listBlocked.innerHTML = `<div class="italic text-[10px] text-slate-500 text-center py-2">Tidak ada blokir aktif</div>`;
      } else {
        listBlocked.innerHTML = blocked.map(b => `
          <div class="flex items-center gap-1.5 py-0.5 border-b border-red-500/10">
            <span class="font-bold text-red-400">${b.username}</span>
            <span class="text-[9px] text-slate-500">Kunci: ${b.blockTime}</span>
            <span class="text-red-500 font-bold ml-auto">${b.remaining}s</span>
          </div>
        `).join('');
      }
    }

    if (logsConsole && window.go_get_history) {
      const logs: any[] = JSON.parse(window.go_get_history()).slice(-8); // latest 8
      logsConsole.innerHTML = logs.map(l => `
        <div class="py-0.5 leading-normal">
          <span class="opacity-40">[${l.timestamp.substring(11)}]</span> ${l.event}
        </div>
      `).join('');
    }
  }

  btnToggleTele?.addEventListener('click', () => {
    leftFrontSegment?.classList.add('hidden');
    leftBackSegment?.classList.remove('hidden');
    renderTelemetryData();
  });

  btnToggleTeleBack?.addEventListener('click', () => {
    leftBackSegment?.classList.add('hidden');
    leftFrontSegment?.classList.remove('hidden');
  });

  // Gopher Auth Login Submission
  formLogin?.addEventListener('submit', (e) => {
    e.preventDefault();
    const userIn = (document.getElementById('login-username') as HTMLInputElement).value;
    const passIn = (document.getElementById('login-password') as HTMLInputElement).value;

    if (!window.go_auth_login) return;
    const res = JSON.parse(window.go_auth_login(userIn, passIn));

    if (res.success) {
      window.spawnToast?.('success', 'Handshake Sukses! ✅', res.message);
      session = { username: res.user.username, email: res.user.email, avatar: res.user.avatar };
      localStorage.setItem('user_session', JSON.stringify(session));
      setDashboardSessionActive(session);
    } else {
      window.spawnToast?.('error', 'Handshake Gagal ❌', res.message);
    }
  });

  // Gopher Auth Registration Submission
  formReg?.addEventListener('submit', (e) => {
    e.preventDefault();
    const userIn = (document.getElementById('reg-username') as HTMLInputElement).value;
    const emailIn = (document.getElementById('reg-email') as HTMLInputElement).value;
    const passIn = (document.getElementById('reg-password') as HTMLInputElement).value;
    const confirmIn = (document.getElementById('reg-confirm-password') as HTMLInputElement).value;

    if (!window.go_auth_register) return;
    const res = JSON.parse(window.go_auth_register(userIn, emailIn, passIn, confirmIn, selectedAvatarInForm));

    if (res.success) {
      window.spawnToast?.('success', 'Registrasi Berhasil! 🎉', res.message);
      // Clean inputs, go back to login tab
      (document.getElementById('reg-username') as HTMLInputElement).value = '';
      (document.getElementById('reg-email') as HTMLInputElement).value = '';
      (document.getElementById('reg-password') as HTMLInputElement).value = '';
      (document.getElementById('reg-confirm-password') as HTMLInputElement).value = '';
      authLabelLogin?.click();
    } else {
      window.spawnToast?.('error', 'Pendaftaran Gagal ❌', res.message);
    }
  });

  // Secure Entry Guest mode bypass
  const registerGuestActions = () => {
    const guestUser = { username: 'GopherGuest', email: 'guest@gopher.wasm', avatar: '🐹' };
    window.spawnToast?.('info', 'Guest Mode Diaktifkan 🔒', 'Selamat datang! Jelajahi dashboard tanpa database eksternal.');
    session = guestUser;
    localStorage.setItem('user_session', JSON.stringify(session));
    setDashboardSessionActive(session);
  };
  
  document.getElementById('btn-auth-guest')?.addEventListener('click', registerGuestActions);
  
  document.querySelectorAll('.btn-signout-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      signoutSessionAction();
    });
  });

  // General Log out trigger
  document.getElementById('btn-signout')?.addEventListener('click', signoutSessionAction);

  function signoutSessionAction() {
    localStorage.removeItem('user_session');
    session = null;
    window.spawnToast?.('warning', 'Sesi Berakhir 🏮', 'Sesi handshake terputus. Silahkan login kembali.');
    setTimeout(() => window.location.reload(), 1000);
  }

  // --- SPEAKER OVERLAY OPTIONS CONTROL ---
  const btnToggleSpeaker = document.getElementById('btn-toggle-speaker');
  const overlaySpeaker = document.getElementById('speaker-set-popover');
  const btnCloseSpeaker = document.getElementById('btn-close-speaker-popover');
  const imeSlider = document.getElementById('chime-volume-slider') as HTMLInputElement;

  btnToggleSpeaker?.addEventListener('click', () => {
    overlaySpeaker?.classList.toggle('hidden');
  });

  btnCloseSpeaker?.addEventListener('click', () => {
    overlaySpeaker?.classList.add('hidden');
  });

  imeSlider?.addEventListener('input', () => {
    const val = imeSlider.value;
    const lbl = document.getElementById('label-speaker-volume');
    if (lbl) lbl.textContent = `${val}%`;
    localStorage.setItem('chime_volume', val);
  });

  document.getElementById('btn-test-chime')?.addEventListener('click', () => {
    const volume = Number(imeSlider.value);
    playAudioAlert('success', volume);
    window.spawnToast?.('success', 'Chime Speaker OK 🔊', 'Synthesizer akustik frekuensi tinggi bekerja sempurna.');
  });


  // --- NAV BAR SIDEBAR TABS CONTROLLERS ---
  const navBtns = document.querySelectorAll('#sidebar-nav button');
  const panels = document.querySelectorAll('.view-panel');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove selected classes
      navBtns.forEach(b => {
        b.setAttribute('class', 'nav-item flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-center text-[10px] sm:text-xs font-bold tracking-wider transition-all text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer flex-1');
      });
      btn.setAttribute('class', 'nav-item flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-center text-[10px] sm:text-xs font-bold tracking-wider transition-all text-blue-400 bg-blue-500/15 border border-blue-500/10 cursor-pointer text-glow flex-1');

      const targetTab = btn.getAttribute('data-tab');
      panels.forEach(p => p.classList.add('hidden'));

      if (targetTab === 'tab-panel-dashboard') {
        document.getElementById('panel-dashboard')?.classList.remove('hidden');
        drawWeeklyTasksChart();
      } else if (targetTab === 'tab-panel-tugas') {
        document.getElementById('panel-tugas')?.classList.remove('hidden');
        updateTugasUI();
      } else if (targetTab === 'tab-panel-calendar') {
        document.getElementById('panel-calendar')?.classList.remove('hidden');
        renderCalendarGrid();
      } else if (targetTab === 'tab-panel-diary') {
        document.getElementById('panel-diary')?.classList.remove('hidden');
      } else if (targetTab === 'tab-panel-games') {
        document.getElementById('panel-games')?.classList.remove('hidden');
      } else if (targetTab === 'tab-panel-player') {
        document.getElementById('panel-player')?.classList.remove('hidden');
      } else if (targetTab === 'tab-panel-settings') {
        document.getElementById('panel-settings')?.classList.remove('hidden');
      }
    });
  });


  // --- INTERACTIVE CONSOLE TERMINAL ---
  const terminalInput = document.getElementById('terminal-input') as HTMLInputElement;
  const terminalSend = document.getElementById('btn-terminal-send');

  terminalInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTerminalCommand();
  });
  terminalSend?.addEventListener('click', handleTerminalCommand);

  function handleTerminalCommand() {
    const text = terminalInput.value.trim();
    if (!text) return;

    terminalInput.value = '';
    appendTerminalLine(`> ${text}`, 'text-blue-400 font-bold');

    const cmd = text.toLowerCase();
    if (cmd === 'help') {
      appendTerminalLine('System Cmd List:\n - clear : Bersihkan layar terminal\n - logs : Tampilkan seluruh kernel log\n - whoami : Detail profil node\n - uptime : Durasi kernel berjalan\n - blocks : Cek blocked list ilegal', 'text-slate-300');
    } else if (cmd === 'clear') {
      const container = document.getElementById('console-terminal-lines');
      if (container) container.innerHTML = '';
    } else if (cmd === 'logs') {
      const logs: any[] = JSON.parse(window.go_get_history ? window.go_get_history() : '[]');
      logs.forEach(l => {
        appendTerminalLine(`[${l.timestamp.substring(11)}] [${l.status}] ${l.event}`, l.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-500');
      });
    } else if (cmd === 'whoami') {
      if (session) {
        appendTerminalLine(`Username: ${session.username}\nEmail: ${session.email}\nStatus: Active Account Mode`, 'text-blue-300');
      } else {
        appendTerminalLine('Guest Mode dialihkan. Hubungkan handshake.', 'text-amber-500');
      }
    } else if (cmd === 'uptime') {
      appendTerminalLine(`Core uptime loop speed: ${uptimeCounter} detik.`, 'text-blue-300');
    } else if (cmd === 'blocks') {
      const blockedList: any[] = JSON.parse(window.go_get_blocked ? window.go_get_blocked() : '[]');
      if (blockedList.length === 0) {
        appendTerminalLine('Seluruh thread luar berstatus: SECURE (Tanpa blokir)', 'text-emerald-400');
      } else {
        blockedList.forEach(b => appendTerminalLine(`Blocked node: '${b.username}' | sisa waktu: ${b.remaining}s`, 'text-red-400'));
      }
    } else {
      appendTerminalLine(`Error: Command '${text}' tidak dikenal. Ketik 'help'`, 'text-red-400');
    }
  }

  function appendTerminalLine(text: string, classAttrs: string) {
    const container = document.getElementById('console-terminal-lines');
    if (!container) return;

    const p = document.createElement('p');
    p.className = `leading-relaxed whitespace-pre-line ${classAttrs}`;
    p.textContent = text;
    container.appendChild(p);

    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 20);
  }


  // =========================================================================
  // 5. CALENDAR & SCHEDULE LIST - MOBILE OPTIMIZATION CONTROLLERS
  // =========================================================================
  document.getElementById('btn-month-prev')?.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendarGrid();
    window.spawnToast?.('info', 'Kalender Digeser', 'Looping grid memori Go dipindahkan ke bulan sebelumnya.');
  });

  document.getElementById('btn-month-next')?.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendarGrid();
    window.spawnToast?.('info', 'Kalender Digeser', 'Looping grid memori Go dipindahkan ke bulan berikutnya.');
  });

  // Mobile Back to Grid click event
  document.getElementById('btn-back-to-calendar')?.addEventListener('click', () => {
    // Hide scheduling details segment
    document.getElementById('calendar-schedule-column')?.classList.add('hidden');
    // Show grid list segment
    document.getElementById('calendar-main-column')?.classList.remove('hidden');
  });

  // Agenda priority click buttons select inside widget
  const prioBtns = document.querySelectorAll('.btn-priority-selector');
  prioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      prioBtns.forEach(x => {
        const priorityType = x.getAttribute('data-priority');
        let unselectedClass = 'btn-priority-selector px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-white/5';
        if (priorityType === 'low') {
          unselectedClass += ' bg-emerald-500/5 text-emerald-500/40';
        } else if (priorityType === 'medium') {
          unselectedClass += ' bg-amber-500/5 text-amber-500/40';
        } else {
          unselectedClass += ' bg-red-500/5 text-red-500/40';
        }
        x.setAttribute('class', unselectedClass);
      });
      
      const p = btn.getAttribute('data-priority') || 'low';
      prioritySelected = p;
      let selectedClass = 'btn-priority-selector px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider selected';
      if (p === 'low') {
        selectedClass += ' bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      } else if (p === 'medium') {
        selectedClass += ' bg-amber-500/15 text-amber-500 border border-amber-500/30';
      } else {
        selectedClass += ' bg-red-500/15 text-red-500 border border-red-500/30';
      }
      btn.setAttribute('class', selectedClass);
    });
  });

  // Agenda adding submit action
  document.getElementById('btn-agenda-add')?.addEventListener('click', () => {
    if (session?.username === 'GopherGuest') {
      window.spawnToast?.('warning', 'Akses Diblokir 🔒', 'Dapatkan credentials penuh dengan mendaftar untuk menyimpan agenda.');
      return;
    }

    if (!selectedDay) {
      window.spawnToast?.('warning', 'Pilih Tanggal', 'Silakan pilih tanggal pada grid kalender terlebih dahulu.');
      return;
    }

    const inputTitleEl = document.getElementById('input-agenda-title') as HTMLInputElement;
    const inputDescEl = document.getElementById('input-agenda-description') as HTMLTextAreaElement;

    const title = inputTitleEl.value.trim();
    const desc = inputDescEl.value.trim();

    if (!title) {
      window.spawnToast?.('warning', 'Kolom Kosong', 'Nama agenda wajib diisi!');
      return;
    }

    const newAgenda: AgendaItem = {
      id: Math.random().toString(36).substring(2, 9),
      day: selectedDay,
      title,
      description: desc,
      priority: prioritySelected
    };

    agendasStore.push(newAgenda);
    localStorage.setItem('agendas_store', JSON.stringify(agendasStore));

    inputTitleEl.value = '';
    inputDescEl.value = '';

    window.spawnToast?.('success', 'Agenda Ditambahkan ✨', `Agenda '${title}' tersimpan di local memory.`);
    renderSchedulingSegmentList();
  });


  // =========================================================================
  // 6. AESTHETIC DIARY WRITING PLATFORM CONTROLLERS
  // =========================================================================
  const btnPaperStyles = document.querySelectorAll('.btn-paper-style');
  const txtDiaryArea = document.getElementById('diary-journal-content') as HTMLTextAreaElement;

  btnPaperStyles.forEach(btn => {
    btn.addEventListener('click', () => {
      btnPaperStyles.forEach(x => {
        x.setAttribute('class', 'btn-paper-style px-2.5 py-1.5 rounded-lg bg-white/10 text-slate-300 text-[10px] uppercase font-bold cursor-pointer');
      });
      btn.setAttribute('class', 'btn-paper-style px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-[10px] uppercase font-bold cursor-pointer');
      
      const paper = btn.getAttribute('data-paper') || 'paper-ruled';
      diaryPaperStyleState = paper;
      txtDiaryArea.className = `w-full min-h-[400px] p-8 outline-none resize-none text-base border-t-0 smooth-scroll transition-all ${paper}`;
    });
  });

  // Typography Family Controller
  const diaryFontSelect = document.getElementById('diary-font-select') as HTMLSelectElement;
  diaryFontSelect?.addEventListener('change', () => {
    const fam = diaryFontSelect.value;
    txtDiaryArea.style.fontFamily = fam === 'cursive' ? "'Great Vibes', cursive" : `var(--font-${fam.substring(5)})`;
  });

  // Sizing changes
  fontPixelSize = 14;
  const lblFontSize = document.getElementById('label-font-size');

  document.getElementById('btn-font-smaller')?.addEventListener('click', () => {
    if (fontPixelSize > 10) {
      fontPixelSize -= 2;
      txtDiaryArea.style.fontSize = `${fontPixelSize}px`;
      if (lblFontSize) lblFontSize.textContent = `${fontPixelSize}px`;
    }
  });

  document.getElementById('btn-font-larger')?.addEventListener('click', () => {
    if (fontPixelSize < 28) {
      fontPixelSize += 2;
      txtDiaryArea.style.fontSize = `${fontPixelSize}px`;
      if (lblFontSize) lblFontSize.textContent = `${fontPixelSize}px`;
    }
  });

  // Characters counter
  txtDiaryArea?.addEventListener('input', () => {
    const labelCount = document.getElementById('label-diary-char-count');
    if (labelCount) labelCount.textContent = txtDiaryArea.value.length.toString();
  });

  // Saving sheet
  document.getElementById('btn-diary-save')?.addEventListener('click', () => {
    if (session?.username === 'GopherGuest') {
      window.spawnToast?.('warning', 'Guest Mode🔒', 'Fitur diary tidak dapat disimpan secara permanen di mode Tamu.');
      return;
    }

    const titleEl = document.getElementById('diary-journal-title') as HTMLInputElement;
    const tVal = titleEl.value.trim() || 'Lembaran Diary Tanpa Judul';
    const cVal = txtDiaryArea.value.trim();

    if (!cVal) {
      window.spawnToast?.('warning', 'Content Kosong', 'Jurnal tidak boleh kosong!');
      return;
    }

    if (activeEditDiaryId) {
      // Modifying
      diarySheets = diarySheets.map(x => x.id === activeEditDiaryId ? {
        ...x,
        title: tVal,
        content: cVal,
        font: diaryFontSelect.value,
        size: fontPixelSize.toString()
      } : x);
      window.spawnToast?.('success', 'Diary Diperbarui ✅', `'${tVal}' berhasil diredistribusikan ke cache.`);
    } else {
      // Creating new
      const s: LocalFileSheet = {
        id: Math.random().toString(36).substring(2, 9),
        title: tVal,
        content: cVal,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        font: diaryFontSelect.value,
        size: fontPixelSize.toString()
      };
      diarySheets.unshift(s);
      window.spawnToast?.('success', 'Diary Tersimpan 💾', `'${tVal}' berhasil didaftarkan di log memori.`);
    }

    localStorage.setItem('diary_sheets', JSON.stringify(diarySheets));
    
    // Clear form
    titleEl.value = '';
    txtDiaryArea.value = '';
    const labelCount = document.getElementById('label-diary-char-count');
    if (labelCount) labelCount.textContent = '0';

    cancelDiaryEditMode();
    renderDiarySheetsHistory();
  });

  document.getElementById('btn-diary-cancel-edit')?.addEventListener('click', cancelDiaryEditMode);


  // =========================================================================
  // 7. MULTI-GAMES INTERACTIVE SANDBOX CONTROLLERS
  // =========================================================================
  const subGameBtns = document.querySelectorAll('.btn-game-selector');
  const gameSegments = {
    tictactoe: document.getElementById('game-segment-tictactoe'),
    dice: document.getElementById('game-segment-dice'),
    memory: document.getElementById('game-segment-memory'),
    sliding: document.getElementById('game-segment-sliding')
  };

  subGameBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subGameBtns.forEach(x => {
        x.setAttribute('class', 'btn-game-selector px-2.5 py-1.5 rounded-lg bg-white/10 text-slate-300 text-[10px] uppercase font-bold cursor-pointer');
      });
      btn.setAttribute('class', 'btn-game-selector px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold cursor-pointer');
      
      const gameType = btn.getAttribute('data-game') as keyof typeof gameSegments;
      
      // Hide all segments
      Object.values(gameSegments).forEach(seg => seg?.classList.add('hidden'));
      // Show matching segment
      gameSegments[gameType]?.classList.remove('hidden');

      if (gameType === 'tictactoe') {
        resetTicTacToeGame();
      } else if (gameType === 'memory') {
        initializeMemoryCardPairsGame();
      } else if (gameType === 'sliding') {
        initializeSlidingGridMatrix();
      }
    });
  });

  // Tic-Tac-Toe cells click binds
  const tttCells = document.querySelectorAll('.btn-ttt-cell');
  tttCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const idx = Number(cell.getAttribute('data-idx'));
      if (!window.go_ttt_move) return;

      const state = JSON.parse(window.go_ttt_move(idx));
      renderTicTacToeState(state);
    });
  });

  document.getElementById('btn-ttt-reset')?.addEventListener('click', () => {
    if (!window.go_ttt_reset) return;
    const state = JSON.parse(window.go_ttt_reset());
    renderTicTacToeState(state);
    window.spawnToast?.('info', 'Papan Disegarkan 🔁', 'Langkah Tic-Tac-Toe dialihkan ke giliran awal.');
  });

  // Dice roll button execution
  const diceGraphicBtn = document.getElementById('dice-graphic');
  const btnRollDiceTrigger = document.getElementById('btn-dice-roll');

  btnRollDiceTrigger?.addEventListener('click', executeRNGDiceAnimation);

  function executeRNGDiceAnimation() {
    if (!btnRollDiceTrigger || !diceGraphicBtn || !window.go_roll_dice) return;

    btnRollDiceTrigger.setAttribute('disabled', 'true');
    btnRollDiceTrigger.classList.add('opacity-40');
    
    let rollCycles = 0;
    const timer = setInterval(() => {
      rollCycles++;
      const randValue = Math.floor(Math.random() * 6) + 1;
      diceGraphicBtn.textContent = randValue.toString();
      diceGraphicBtn.style.transform = `scale(0.95) rotate(${rollCycles * 45}deg)`;
      
      if (rollCycles >= 8) {
        clearInterval(timer);
        const finalValue = window.go_roll_dice!();
        diceGraphicBtn.textContent = finalValue.toString();
        diceGraphicBtn.style.transform = 'scale(1) rotate(0deg)';
        btnRollDiceTrigger.removeAttribute('disabled');
        btnRollDiceTrigger.classList.remove('opacity-40');

        window.spawnToast?.('success', 'Dice Rolled! 🎲', `Go Random RNG Generator mengembalikan nilai: ${finalValue}`);
      }
    }, 100);
  }

  // Memory match match reset trig
  document.getElementById('btn-memory-reset')?.addEventListener('click', () => {
    initializeMemoryCardPairsGame();
    window.spawnToast?.('info', 'Memory Reset', 'Mengocok susunan gambar/kartu pairs baru.');
  });

  // Sliding math segment reset triggers
  document.getElementById('btn-sliding-reset')?.addEventListener('click', () => {
    initializeSlidingGridMatrix();
    window.spawnToast?.('info', 'Puzzle Kocok', 'Menggeser susunan dan memeriksa solvabilitas via Go.');
  });


  // =========================================================================
  // 8. CONTINUOUS LO-FI PULSE MUSIC PLAYER CONTROLLERS (High-Fidelity Lyrics Synth)
  // =========================================================================
  const btnMusicPlay = document.getElementById('btn-music-play');
  const progressSlider = document.getElementById('music-tracker-slider') as HTMLInputElement;
  const volumeSlider = document.getElementById('music-volume-slider') as HTMLInputElement;

  btnMusicPlay?.addEventListener('click', () => {
    if (activeTracksList.length === 0) {
      window.spawnToast?.('warning', 'Belum Ada Lagu', 'Daftarkan lagu baru di form tambah lagu!');
      return;
    }

    if (!musicPlayingTrackId) {
      musicPlayingTrackId = activeTracksList[0].id;
    }

    if (musicPlayingState) {
      pausePlayingMusicTrack();
    } else {
      playSelectedTrack(musicPlayingTrackId);
    }
  });

  // Next and Previous tracks triggers
  document.getElementById('btn-music-prev')?.addEventListener('click', () => {
    executePrevAudioTrack();
  });

  document.getElementById('btn-music-next')?.addEventListener('click', () => {
    executeNextAudioTrack(false);
  });

  // Shuffle & Repeat toggles
  document.getElementById('btn-music-shuffle')?.addEventListener('click', () => {
    isShuffleMode = !isShuffleMode;
    updateShuffleRepeatButtons();
    window.spawnToast?.('info', isShuffleMode ? 'Shuffle Aktif' : 'Shuffle Nonaktif', isShuffleMode ? 'Daftar putar akan dimainkan secara acak.' : 'Daftar putar dimainkan sesuai urutan.');
  });

  document.getElementById('btn-music-repeat')?.addEventListener('click', () => {
    isRepeatMode = !isRepeatMode;
    updateShuffleRepeatButtons();
    window.spawnToast?.('info', isRepeatMode ? 'Repeat Aktif' : 'Repeat Nonaktif', isRepeatMode ? 'Lagu yang sedang berjalan akan diulang terus menerus.' : 'Lagu berikutnya akan berjalan otomatis.');
  });

  // Inline add track button inside player block
  document.getElementById('btn-inline-open-add')?.addEventListener('click', () => {
    if (modalAddTrack) {
      modalAddTrack.classList.remove('opacity-0', 'pointer-events-none');
    }
  });

  // Initialize button styles
  updateShuffleRepeatButtons();

  // Progress Bar scrubbing
  progressSlider?.addEventListener('input', () => {
    const track = activeTracksList.find(t => t.id === musicPlayingTrackId);
    if (!track) return;

    if (track.isProcedural) {
      currentSimulatedTime = (Number(progressSlider.value) / 100) * simulatedDuration;
      handleTimeTicksUpdate(currentSimulatedTime, simulatedDuration);
    } else if (bgAudioNode.duration) {
      const dest = (Number(progressSlider.value) / 100) * bgAudioNode.duration;
      bgAudioNode.currentTime = dest;
    }
  });

  // Volume slider
  volumeSlider?.addEventListener('input', () => {
    bgAudioNode.volume = Number(volumeSlider.value) / 100;
  });

  // Native audio tag updates
  bgAudioNode.addEventListener('timeupdate', () => {
    const track = activeTracksList.find(t => t.id === musicPlayingTrackId);
    if (track && !track.isProcedural) {
      handleTimeTicksUpdate(bgAudioNode.currentTime, bgAudioNode.duration || 120);
    }
  });

  bgAudioNode.addEventListener('ended', () => {
    executeNextAudioTrack(true);
  });

  // Cover presets selection buttons trigger in add track form
  const coverBtns = document.querySelectorAll('#add-track-cover-presets button');
  coverBtns.forEach(btn => {
    btn.addEventListener('click', (ev) => {
      coverBtns.forEach(b => {
        b.classList.remove('active-cover', 'border-2', 'border-white');
        b.classList.add('border', 'border-white/10');
      });
      const targ = ev.currentTarget as HTMLElement;
      targ.classList.remove('border-white/10');
      targ.classList.add('active-cover', 'border-2', 'border-white');
      selectedAddCover = targ.getAttribute('data-cover') || 'g-rose';
    });
  });

  // File selected trigger label update
  const addTrackFileField = document.getElementById('add-track-file') as HTMLInputElement;
  const addTrackFileLabel = document.getElementById('add-track-file-label');
  addTrackFileField?.addEventListener('change', () => {
    if (addTrackFileField.files && addTrackFileField.files.length > 0) {
      if (addTrackFileLabel) {
        addTrackFileLabel.textContent = `TERPILIH: ${addTrackFileField.files[0].name.toUpperCase()}`;
      }
    } else {
      if (addTrackFileLabel) {
        addTrackFileLabel.textContent = 'PILIH FILE MP3...';
      }
    }
  });

  // Modal toggle for Adding Tracks and Lyrics
  const modalAddTrack = document.getElementById('modal-add-track');
  const btnOpenAddTrack = document.getElementById('btn-open-add-track');
  const btnCloseAddTrack = document.getElementById('btn-close-add-track');

  // Modal toggle for Playlist Queue
  const modalPlaylistQueue = document.getElementById('modal-playlist-queue');
  const btnToggleQueue = document.getElementById('btn-toggle-queue');
  const btnCloseQueue = document.getElementById('btn-close-queue');

  const openQueueModal = () => {
    if (modalPlaylistQueue) {
      modalPlaylistQueue.classList.remove('opacity-0', 'pointer-events-none');
    }
  };

  const closeQueueModal = () => {
    if (modalPlaylistQueue) {
      modalPlaylistQueue.classList.add('opacity-0', 'pointer-events-none');
    }
  };

  btnToggleQueue?.addEventListener('click', openQueueModal);
  btnCloseQueue?.addEventListener('click', closeQueueModal);

  modalPlaylistQueue?.addEventListener('click', (e) => {
    if (e.target === modalPlaylistQueue) {
      closeQueueModal();
    }
  });

  btnOpenAddTrack?.addEventListener('click', () => {
    // Hide queue modal if open
    closeQueueModal();
    // Open add track modal
    if (modalAddTrack) {
      modalAddTrack.classList.remove('opacity-0', 'pointer-events-none');
    }
  });

  const closeAddTrackModal = () => {
    if (modalAddTrack) {
      modalAddTrack.classList.add('opacity-0', 'pointer-events-none');
    }
  };

  btnCloseAddTrack?.addEventListener('click', closeAddTrackModal);

  // Close when clicking outside of the card content
  modalAddTrack?.addEventListener('click', (e) => {
    if (e.target === modalAddTrack) {
      closeAddTrackModal();
    }
  });

  // "+" Add Track trigger
  document.getElementById('btn-add-custom-track')?.addEventListener('click', () => {
    const inputTitle = document.getElementById('add-track-title') as HTMLInputElement;
    const inputArtist = document.getElementById('add-track-artist') as HTMLInputElement;
    const inputLyrics = document.getElementById('add-track-lyrics') as HTMLTextAreaElement;

    const title = inputTitle?.value?.trim();
    const artist = inputArtist?.value?.trim() || 'Synth Gopher';
    const lyrics = inputLyrics?.value?.trim() || 'Lirik instrumental...';

    if (!title) {
      window.spawnToast?.('warning', 'Judul Kosong', 'Harap masukkan judul lagu sebelum mendaftarkan trek!');
      return;
    }

    const file = addTrackFileField?.files ? addTrackFileField.files[0] : null;

    // Create a new track object
    const newTrack: EmbeddedTrack = {
      id: 'custom-track-' + Date.now(),
      title: title,
      artist: artist,
      lyrics: lyrics,
      coverPreset: selectedAddCover,
      isProcedural: !file,
      audioBlobUrl: file ? URL.createObjectURL(file) : undefined,
      filename: file ? file.name : undefined
    };

    activeTracksList.push(newTrack);

    // Save custom list to local storage (filter out blob for serialization)
    const customMetadataOnly = activeTracksList.filter(t => t.id.startsWith('custom-track-')).map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      lyrics: t.lyrics,
      coverPreset: t.coverPreset,
      isProcedural: t.isProcedural,
      filename: t.filename
    }));

    localStorage.setItem('custom_tracks_metadata', JSON.stringify(customMetadataOnly));

    window.spawnToast?.('success', 'Trek Berhasil Diterima ✅', `Lagu "${title}" dimasukkan ke playlist!`);

    // Reset fields
    if (inputTitle) inputTitle.value = '';
    if (inputArtist) inputArtist.value = '';
    if (inputLyrics) inputLyrics.value = '';
    if (addTrackFileField) addTrackFileField.value = '';
    if (addTrackFileLabel) addTrackFileLabel.textContent = 'PILIH FILE MP3...';

    // Close the entry modal
    closeAddTrackModal();

    // Rerender tracklist queue
    renderMainPlaylistDomQueue();
  });


  // =========================================================================
  // 9. DYNAMIC THEME SELECTION PANEL AND COLOR PICKERS
  // =========================================================================
  const colorPickerP = document.getElementById('set-color-primary') as HTMLInputElement;
  const colorPickerS = document.getElementById('set-color-secondary') as HTMLInputElement;
  const slideGlow = document.getElementById('slider-glow-intensity') as HTMLInputElement;

  colorPickerP?.addEventListener('input', () => {
    applyInteractiveCSSVariables(colorPickerP.value, colorPickerS.value, Number(slideGlow.value));
  });

  colorPickerS?.addEventListener('input', () => {
    applyInteractiveCSSVariables(colorPickerP.value, colorPickerS.value, Number(slideGlow.value));
  });

  slideGlow?.addEventListener('input', () => {
    applyInteractiveCSSVariables(colorPickerP.value, colorPickerS.value, Number(slideGlow.value));
  });

  // Bind Preset Theme Card clicks
  document.querySelectorAll('.theme-preset-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      if (preset) {
        applyThemePreset(preset);
        const nameMap: Record<string, string> = {
          'theme-dk-classic': 'Dark Cosmic Blue',
          'theme-dk-emerald': 'Dark Emerald Cyber',
          'theme-dk-rosered': 'Dark Rose Crimson',
          'theme-lt-sakura': 'Light Sakura Dawn',
          'theme-lt-nordic': 'Light Nordic Mint',
          'theme-lt-rosered': 'Light Rose Velvet'
        };
        window.spawnToast?.('success', 'Tema Diubah ✨', `Preset ${nameMap[preset] || preset} diaktifkan.`);
      }
    });
  });

  // Profile update form submissives
  document.getElementById('form-update-profile')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (session?.username === 'GopherGuest') {
      window.spawnToast?.('warning', 'Guest Mode 🔒', 'Daftarkan akun personal Anda untuk mendukung perubahan profil permanen.');
      return;
    }

    const oUs = session ? session.username : '';
    const nUs = (document.getElementById('update-username') as HTMLInputElement).value;
    const mail = (document.getElementById('update-email') as HTMLInputElement).value;
    const avS = (document.getElementById('update-avatar-select') as HTMLSelectElement).value;
    const passNew = (document.getElementById('update-newpassword') as HTMLInputElement).value;

    if (!window.go_update_profile) return;
    const res = JSON.parse(window.go_update_profile(oUs, nUs, mail, passNew, avS));

    if (res.success) {
      window.spawnToast?.('success', 'Profil Diupdate ✨', res.message);
      
      const updatedSess = { username: res.user.username, email: res.user.email, avatar: res.user.avatar };
      session = updatedSess;
      localStorage.setItem('user_session', JSON.stringify(session));
      setDashboardSessionActive(session);

      // Reset passwd field
      (document.getElementById('update-newpassword') as HTMLInputElement).value = '';
    } else {
      window.spawnToast?.('error', 'Update Gagal ❌', res.message);
    }
  });

}


// =========================================================================
// 10. INTERACTION FUNCTIONS & ENGINE RENDERS (VANILLA INJECTION)
// =========================================================================

// --- CALENDAR RENDER ---
function renderCalendarGrid() {
  const containerDays = document.getElementById('calendar-grid-days');
  const labelMonthYear = document.getElementById('label-month-year');
  if (!containerDays || !labelMonthYear || !window.go_get_calendar) return;

  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const data = JSON.parse(window.go_get_calendar(year, month));
  labelMonthYear.textContent = `${data.month_name} ${data.year}`;

  let daysHtml = '';
  // Map rows representing weeks
  data.days.forEach((week: any[]) => {
    week.forEach((day: number | null) => {
      if (day === null) {
        daysHtml += `<div class="p-3 opacity-0"></div>`;
      } else {
        const doubleDay = day.toString().padStart(2, '0');
        const doubleMonth = month.toString().padStart(2, '0');
        const dayStr = `${year}-${doubleMonth}-${doubleDay}`;

        // Verify if active selected day
        const isSelected = selectedDay === dayStr;
        const existsAgendas = agendasStore.some(a => a.day === dayStr);

        let cellClass = `p-3 rounded-xl transition-all cursor-pointer select-none border border-transparent flex flex-col items-center justify-between min-h-[64px] hover:border-blue-400/30 `;
        
        if (isSelected) {
          cellClass += 'bg-blue-600/25 border-blue-400 font-bold text-white text-glow shadow-md';
        } else {
          cellClass += 'bg-slate-950/40 text-slate-300';
        }

        // Highlight marker dot if has agendas
        const dotMarkup = existsAgendas 
          ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-1"></span>` 
          : `<span class="w-1.5 h-1.5 mt-1"></span>`;

        daysHtml += `
          <div class="${cellClass}" onclick="window.calendarDaySelectedAction('${dayStr}')">
            <span>${day}</span>
            ${dotMarkup}
          </div>
        `;
      }
    });
  });

  containerDays.innerHTML = daysHtml;
}

// Global hook bound to window to receive day selects from calendar cards
(window as any).calendarDaySelectedAction = (dayStr: string) => {
  selectedDay = dayStr;
  
  // Update labels
  const labelDate = document.getElementById('label-selected-date');
  if (labelDate) labelDate.textContent = dayStr;

  // Re-render layout grid borders
  renderCalendarGrid();
  renderSchedulingSegmentList();

  // MOBILE DEVICE OPTIMIZED WORKFLOW!
  // "optimalkan UI untuk mobile device (kalender di mobile cukup rampilkan kalendernya saja, begitu di klik salah satu tanggalnya baru muncul halaman schedule)"
  // We check if the viewport width fits a mobile configuration
  if (window.innerWidth < 1024) {
    // Hide calendar grid segment
    document.getElementById('calendar-main-column')?.classList.add('hidden');
    // Show planner list/agenda details
    document.getElementById('calendar-schedule-column')?.classList.remove('hidden');
  }
};

function renderSchedulingSegmentList() {
  const container = document.getElementById('calendar-agendas-lists');
  if (!container) return;

  if (!selectedDay) {
    container.innerHTML = `<div class="italic text-[11px] text-slate-500 text-center py-10">Pilih tanggal di kalender atau buat agenda baru!</div>`;
    return;
  }

  const matches = agendasStore.filter(a => a.day === selectedDay);
  if (matches.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500 text-xs">
        <i class="fa-solid fa-face-smile text-2xl opacity-40 mb-2"></i>
        <p>Belum ada agenda untuk hari ini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = matches.map(a => {
    let cardBorder = 'border-slate-800 bg-slate-900/30';
    let labelBadge = '';
    
    if (a.priority === 'high') {
      cardBorder = 'border-red-500/10 bg-red-500/5';
      labelBadge = '<span class="px-1.5 py-0.5 rounded text-[8px] bg-red-400/25 text-red-400 font-black uppercase">HIGH</span>';
    } else if (a.priority === 'medium') {
      cardBorder = 'border-amber-500/10 bg-amber-500/5';
      labelBadge = '<span class="px-1.5 py-0.5 rounded text-[8px] bg-amber-400/25 text-amber-500 font-black uppercase">MEDIUM</span>';
    } else {
      cardBorder = 'border-emerald-500/10 bg-emerald-500/5';
      labelBadge = '<span class="px-1.5 py-0.5 rounded text-[8px] bg-emerald-400/25 text-emerald-400 font-black uppercase">LOW</span>';
    }

    return `
      <div class="p-3.5 rounded-xl border ${cardBorder} flex justify-between gap-2 transition-all">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="font-bold text-xs text-white truncate">${a.title}</h4>
            ${labelBadge}
          </div>
          <p class="text-[11px] text-slate-400 mt-1.5 leading-normal whitespace-pre-line">${a.description || 'Tidak ada catatan'}</p>
        </div>
        <button class="text-red-400 hover:text-red-500 text-sm self-start" onclick="window.calendarDeleteAgendaAction('${a.id}')" title="Hapus Agenda"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
  }).join('');
}

(window as any).calendarDeleteAgendaAction = (id: string) => {
  if (session?.username === 'GopherGuest') {
    window.spawnToast?.('warning', 'Guest Mode 🔒', 'Akses diblokir. Dapatkan credential terdaftar untuk menghidupkan manajemen.');
    return;
  }

  agendasStore = agendasStore.filter(a => a.id !== id);
  localStorage.setItem('agendas_store', JSON.stringify(agendasStore));

  window.spawnToast?.('info', 'Agenda Dihapus 🗑', 'Jadwal dibersihkan dari penyimpanan.');
  renderCalendarGrid();
  renderSchedulingSegmentList();
};


// --- DIARY HISTORY ---
function renderDiarySheetsHistory() {
  const container = document.getElementById('diary-history-sheets-container');
  const labelCount = document.getElementById('label-diary-total-sheets');

  if (labelCount) labelCount.textContent = `${diarySheets.length} Lembar`;
  if (!container) return;

  if (diarySheets.length === 0) {
    container.innerHTML = `<div class="smallmid-card italic text-slate-500 text-xs text-center py-20 bg-slate-900/10">Belum ada lembaran diary. Buat di sebelah kiri!</div>`;
    return;
  }

  container.innerHTML = diarySheets.map(s => `
    <div class="small-card cursor-pointer space-y-2 relative group" onclick="window.diaryLoadSheetAction('${s.id}')">
      <div class="flex items-center justify-between gap-2">
        <h4 class="font-bold text-xs text-white truncate pr-6">${s.title}</h4>
        <button class="absolute top-4 right-4 text-slate-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all" onclick="event.stopPropagation(); window.diaryDeleteSheetAction('${s.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
      <p class="text-[10px] text-slate-500 font-mono">${s.date}</p>
      <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${s.content}</p>
    </div>
  `).join('');
}

(window as any).diaryLoadSheetAction = (id: string) => {
  const found = diarySheets.find(s => s.id === id);
  if (!found) return;

  activeEditDiaryId = found.id;
  
  // Populate form
  (document.getElementById('diary-journal-title') as HTMLInputElement).value = found.title;
  const area = document.getElementById('diary-journal-content') as HTMLTextAreaElement;
  area.value = found.content;

  const countEl = document.getElementById('label-diary-char-count');
  if (countEl) countEl.textContent = found.content.length.toString();

  // Apply Font
  const fontSelect = document.getElementById('diary-font-select') as HTMLSelectElement;
  fontSelect.value = found.font || 'font-sans';
  area.style.fontFamily = fontSelect.value === 'cursive' ? "'Great Vibes', cursive" : `var(--font-${fontSelect.value.substring(5)})`;

  // Apply size
  fontPixelSize = Number(found.size || '14');
  area.style.fontSize = `${fontPixelSize}px`;
  const lblSize = document.getElementById('label-font-size');
  if (lblSize) lblSize.textContent = `${fontPixelSize}px`;

  // Show status mode edit edit
  document.getElementById('diary-mode-pill')?.classList.remove('hidden');
  document.getElementById('btn-diary-cancel-edit')?.classList.remove('hidden');

  window.spawnToast?.('info', 'Catatan Jurnal Dimuat 📖', `'${found.title}' dipisahkan ke ruang edit.`);
};

(window as any).diaryDeleteSheetAction = (id: string) => {
  if (session?.username === 'GopherGuest') {
    window.spawnToast?.('warning', 'Guest Mode 🔒', 'Akses Diblokir! Penghapusan dinonaktifkan.');
    return;
  }

  diarySheets = diarySheets.filter(s => s.id !== id);
  localStorage.setItem('diary_sheets', JSON.stringify(diarySheets));

  window.spawnToast?.('warning', 'Diary Dihapus 🗑', 'Lembaran diary dirobek dan dibersihkan.');
  
  if (activeEditDiaryId === id) {
    cancelDiaryEditMode();
  }

  renderDiarySheetsHistory();
};

function cancelDiaryEditMode() {
  activeEditDiaryId = null;
  document.getElementById('diary-mode-pill')?.classList.add('hidden');
  document.getElementById('btn-diary-cancel-edit')?.classList.add('hidden');

  (document.getElementById('diary-journal-title') as HTMLInputElement).value = '';
  const area = document.getElementById('diary-journal-content') as HTMLTextAreaElement;
  area.value = '';
  
  const countEl = document.getElementById('label-diary-char-count');
  if (countEl) countEl.textContent = '0';
}


// --- GAMES RENDERING ---
function resetTicTacToeGame() {
  if (!window.go_ttt_reset) return;
  const state = JSON.parse(window.go_ttt_reset());
  renderTicTacToeState(state);
}

function renderTicTacToeState(state: any) {
  const cells = document.querySelectorAll('.btn-ttt-cell');
  cells.forEach((cell, idx) => {
    const val = state.board[idx];
    cell.textContent = val;
    
    // Aesthetic color
    if (val === 'X') {
      cell.setAttribute('class', 'btn-ttt-cell w-16 h-16 rounded-xl bg-slate-950 border border-blue-400 flex items-center justify-center text-2xl font-black font-display text-blue-400 text-glow transition-all');
    } else if (val === 'O') {
      cell.setAttribute('class', 'btn-ttt-cell w-16 h-16 rounded-xl bg-slate-950 border border-emerald-400 flex items-center justify-center text-2xl font-black font-display text-emerald-400 text-glow-secondary transition-all');
    } else {
      cell.setAttribute('class', 'btn-ttt-cell w-16 h-16 rounded-xl bg-slate-950 border border-white/10 hover:border-blue-400/50 flex items-center justify-center text-2xl font-black font-display text-white transition-all');
    }
  });

  const turnEl = document.getElementById('val-ttt-turn');
  if (turnEl) turnEl.textContent = state.turn;

  if (state.winner) {
    if (state.winner === 'Draw') {
      window.spawnToast?.('info', 'Permainan Seri! 🤝', 'Handshake seri, tidak ada pemenang.');
    } else {
      window.spawnToast?.('success', 'Winner! 👑', `Pembuat algoritma Go mendeteksi kemenangan Player: ${state.winner}`);
    }
    resetTicTacToeGame();
  }
}

// Memory match game controller
function initializeMemoryCardPairsGame() {
  if (!window.go_init_memory) return;

  const raw = window.go_init_memory(16);
  memoryCards = JSON.parse(raw);
  memoryFlipped = [];
  memoryMatchedCount = 0;
  memoryScore = 0;

  const scoreEl = document.getElementById('val-memory-score');
  const matchedEl = document.getElementById('val-memory-matched');
  if (scoreEl) scoreEl.textContent = '0';
  if (matchedEl) matchedEl.textContent = '0/8';

  renderMemoryGridSegment();
}

function renderMemoryGridSegment() {
  const container = document.getElementById('memory-cards-grid');
  if (!container) return;

  const iconsSet = ["🚀", "🌈", "👾", "🦊", "🍍", "🍟", "⚽", "🧩"];

  container.innerHTML = memoryCards.map((card, idx) => {
    let cardClass = `w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold select-none cursor-pointer border transition-all `;
    let textNode = '?';

    if (card.flipped || card.matched) {
      cardClass += 'bg-slate-900 border-emerald-400 text-white';
      textNode = iconsSet[card.val];
    } else {
      cardClass += 'bg-slate-950/80 border-white/10 hover:border-blue-400/40 text-blue-400';
    }

    return `
      <div class="${cardClass}" onclick="window.memoryCardClickedAction(${idx})">
        ${textNode}
      </div>
    `;
  }).join('');
}

(window as any).memoryCardClickedAction = (idx: number) => {
  if (memoryFlipped.length >= 2 || memoryCards[idx].flipped || memoryCards[idx].matched) return;

  // Flip the card
  memoryCards[idx].flipped = true;
  memoryFlipped.push(idx);

  renderMemoryGridSegment();

  if (memoryFlipped.length === 2) {
    const [first, second] = memoryFlipped;
    if (memoryCards[first].val === memoryCards[second].val) {
      // Match success
      memoryCards[first].matched = true;
      memoryCards[second].matched = true;
      memoryMatchedCount++;
      memoryScore += 10;
      
      memoryFlipped = [];
      
      const scoreEl = document.getElementById('val-memory-score');
      const matchedEl = document.getElementById('val-memory-matched');
      if (scoreEl) scoreEl.textContent = memoryScore.toString();
      if (matchedEl) matchedEl.textContent = `${memoryMatchedCount}/8`;

      renderMemoryGridSegment();

      if (memoryMatchedCount === 8) {
        window.spawnToast?.('success', 'Game Completed! 🎉', `Selamat! Anda menyelesaikan Memory Game dengan skor: ${memoryScore}`);
      }
    } else {
      // Mis-match flip back slowly
      memoryScore = Math.max(0, memoryScore - 2);
      const scoreEl = document.getElementById('val-memory-score');
      if (scoreEl) scoreEl.textContent = memoryScore.toString();

      setTimeout(() => {
        memoryCards[first].flipped = false;
        memoryCards[second].flipped = false;
        memoryFlipped = [];
        renderMemoryGridSegment();
      }, 700);
    }
  }
};

// Sliding puzzle
function initializeSlidingGridMatrix() {
  if (!window.go_init_sliding) return;
  const raw = window.go_init_sliding();
  const arr = JSON.parse(raw);
  renderSlidingGridState(arr);
}

function renderSlidingGridState(arr: any[]) {
  const container = document.getElementById('sliding-puzzle-grid');
  if (!container) return;

  container.innerHTML = arr.map((val, idx) => {
    if (val === null) {
      return `<div class="w-14 h-14 bg-slate-950/20 border border-transparent rounded-xl"></div>`;
    }

    return `
      <div class="w-14 h-14 bg-slate-900 border border-blue-500/30 hover:border-blue-400 text-blue-300 rounded-xl flex items-center justify-center font-bold text-sm select-none cursor-pointer transition-all" onclick="window.slidingCellClickedAction(${idx})">
        ${val}
      </div>
    `;
  }).join('');
}

(window as any).slidingCellClickedAction = (idx: number) => {
  if (!window.go_move_sliding) return;

  const raw = window.go_move_sliding(idx);
  if (!raw) return; // invalid move

  const state = JSON.parse(raw);
  renderSlidingGridState(state.board);

  if (state.solved) {
    window.spawnToast?.('success', 'Solved Puzzle! 🧩', 'Luar biasa! Struktur baris kolom matrix berurutan kembali.');
    initializeSlidingGridMatrix();
  }
};


// --- ACTIVE PLAYERS VIEW CONTROLLERS ---
interface ParsedLyricLine {
  time: number; // in seconds
  text: string;
}

function parseLyrics(lyricText: string): ParsedLyricLine[] {
  const lines = lyricText.split('\n');
  const result: ParsedLyricLine[] = [];
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;
  
  for (let l of lines) {
    l = l.trim();
    if (!l) continue;
    
    const match = timeRegex.exec(l);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3], 10) : 0;
      const totalSeconds = minutes * 60 + seconds + ms / 100;
      const text = l.replace(timeRegex, '').trim();
      result.push({ time: totalSeconds, text });
    } else {
      result.push({ time: -1, text: l });
    }
  }
  
  const timedLines = result.filter(r => r.time >= 0);
  if (timedLines.length > 0) {
    return timedLines.sort((a, b) => a.time - b.time);
  }
  
  // Linear interpolation fallback
  return result.map((r, idx) => ({
    time: idx * 6,
    text: r.text
  }));
}

function renderTrackLyrics(track: EmbeddedTrack) {
  const scroller = document.getElementById('lyrics-display-scroller');
  if (!scroller) return;
  
  const parsed = parseLyrics(track.lyrics);
  currentParsedLyrics = parsed;
  
  if (parsed.length === 0) {
    scroller.innerHTML = `
      <div class="text-slate-500 text-xs font-mono py-16 text-center">
        Tidak ada lirik terpasang pada trek ini.
      </div>
    `;
    return;
  }
  
  scroller.innerHTML = parsed.map((item, idx) => {
    return `
      <p id="lyric-line-${idx}" class="lyric-line text-[15px] sm:text-xl font-medium text-slate-400 transition-all duration-300 select-none py-2 transform hover:scale-102 cursor-pointer" onclick="window.seekToLyricTime(${item.time})">
        ${item.text}
      </p>
    `;
  }).join('');
  
  scroller.scrollTop = 0;
}

function renderActivePlayerVisuals() {
  const textTitle = document.getElementById('music-track-title');
  const textArtist = document.getElementById('music-track-artist');
  const artworkDisc = document.getElementById('music-disc-artwork');
  const btnPlay = document.getElementById('btn-music-play');
  const sourceBadge = document.getElementById('music-source-badge');
  const lyricsStatusBadge = document.getElementById('music-lyrics-status-badge');

  const activeTrack = activeTracksList.find(t => t.id === musicPlayingTrackId);

  if (textTitle) {
    textTitle.textContent = activeTrack ? activeTrack.title : 'Tidak Ada Lagu Terpilih';
  }

  if (textArtist) {
    textArtist.textContent = activeTrack ? activeTrack.artist : 'Silakan pilih lagu dari daftar putar';
  }

  if (btnPlay) {
    btnPlay.innerHTML = musicPlayingState 
      ? '<i class="fa-solid fa-pause"></i>' 
      : '<i class="fa-solid fa-play translate-x-0.5"></i>';
  }

  if (sourceBadge) {
    if (activeTrack) {
      sourceBadge.textContent = activeTrack.isProcedural ? 'Sintesis Musik' : 'Audio MP3';
      sourceBadge.className = activeTrack.isProcedural
        ? 'px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        : 'px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-purple-500/30 bg-purple-500/10 text-purple-400';
    } else {
      sourceBadge.textContent = 'Siap';
      sourceBadge.className = 'px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-white/10 bg-white/5 text-slate-400';
    }
  }

  if (lyricsStatusBadge) {
    lyricsStatusBadge.textContent = activeTrack ? 'Lirik Aktif' : 'Musik Saja';
  }

  if (artworkDisc) {
    artworkDisc.className = "w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center relative shadow-2xl overflow-hidden transition-all duration-300 shrink-0 border border-white/10";
    
    if (activeTrack) {
      if (activeTrack.coverPreset === 'g-rose') {
        artworkDisc.classList.add('bg-gradient-to-br', 'from-rose-500', 'to-amber-500');
      } else if (activeTrack.coverPreset === 'g-emerald') {
        artworkDisc.classList.add('bg-gradient-to-br', 'from-emerald-400', 'to-teal-700');
      } else if (activeTrack.coverPreset === 'g-cyber') {
        artworkDisc.classList.add('bg-gradient-to-br', 'from-purple-600', 'to-blue-500');
      } else {
        artworkDisc.classList.add('bg-gradient-to-br', 'from-slate-940', 'to-neutral-800');
      }
    } else {
      artworkDisc.classList.add('bg-gradient-to-br', 'from-rose-500', 'via-purple-600', 'to-indigo-600');
    }

    if (musicPlayingState) {
      artworkDisc.classList.add('animate-spin');
      artworkDisc.style.animationDuration = '12s';
    } else {
      artworkDisc.classList.remove('animate-spin');
    }
  }

  if (activeTrack) {
    renderTrackLyrics(activeTrack);
  } else {
    const scroller = document.getElementById('lyrics-display-scroller');
    if (scroller) {
      scroller.innerHTML = `
        <div class="text-slate-500 text-xs font-mono py-16 text-center">
          Lirik lagu akan tampil otomatis saat trek audio dimainkan.
        </div>
      `;
    }
  }
}

function updateShuffleRepeatButtons() {
  const btnShuffle = document.getElementById('btn-music-shuffle');
  const btnRepeat = document.getElementById('btn-music-repeat');
  
  if (btnShuffle) {
    if (isShuffleMode) {
      btnShuffle.className = 'w-9 h-9 flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl text-emerald-400 border border-emerald-500/30 font-bold transition-all text-xs cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]';
    } else {
      btnShuffle.className = 'w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all text-xs cursor-pointer border border-white/5';
    }
  }

  if (btnRepeat) {
    if (isRepeatMode) {
      btnRepeat.className = 'w-9 h-9 flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl text-emerald-400 border border-emerald-500/30 font-bold transition-all text-xs cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]';
    } else {
      btnRepeat.className = 'w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all text-xs cursor-pointer border border-white/5';
    }
  }
}

function executePrevAudioTrack() {
  if (activeTracksList.length === 0) return;
  
  let prevIdx = 0;
  if (isShuffleMode) {
    if (activeTracksList.length > 1) {
      const currentIdx = musicPlayingTrackId ? activeTracksList.findIndex(t => t.id === musicPlayingTrackId) : -1;
      do {
        prevIdx = Math.floor(Math.random() * activeTracksList.length);
      } while (prevIdx === currentIdx);
    } else {
      prevIdx = 0;
    }
  } else {
    const idx = musicPlayingTrackId ? activeTracksList.findIndex(t => t.id === musicPlayingTrackId) : 0;
    prevIdx = (idx - 1 + activeTracksList.length) % activeTracksList.length;
  }

  playSelectedTrack(activeTracksList[prevIdx].id);
  window.spawnToast?.('info', 'Lagu Sebelumnya', `Memutar: ${activeTracksList[prevIdx].title}`);
}

function executeNextAudioTrack(isAuto: boolean = false) {
  if (activeTracksList.length === 0) return;

  if (isAuto && isRepeatMode && musicPlayingTrackId) {
    playSelectedTrack(musicPlayingTrackId);
    return;
  }

  let nextIdx = 0;
  if (isShuffleMode) {
    if (activeTracksList.length > 1) {
      const currentIdx = musicPlayingTrackId ? activeTracksList.findIndex(t => t.id === musicPlayingTrackId) : -1;
      do {
        nextIdx = Math.floor(Math.random() * activeTracksList.length);
      } while (nextIdx === currentIdx);
    } else {
      nextIdx = 0;
    }
  } else {
    const idx = musicPlayingTrackId ? activeTracksList.findIndex(t => t.id === musicPlayingTrackId) : -1;
    nextIdx = (idx + 1) % activeTracksList.length;
  }

  playSelectedTrack(activeTracksList[nextIdx].id);
  window.spawnToast?.('info', 'Lagu Berikutnya', `Memutar: ${activeTracksList[nextIdx].title}`);
}

function renderMainPlaylistDomQueue() {
  const container = document.getElementById('music-playlist-queue');
  const counter = document.getElementById('music-queue-counter');
  
  const inlineContainer = document.getElementById('music-inline-playlist-queue');
  const inlineCounter = document.getElementById('music-inline-queue-counter');

  const totalTracks = activeTracksList.length;

  if (counter) {
    counter.textContent = `${totalTracks} Lagu`;
  }
  if (inlineCounter) {
    inlineCounter.textContent = `${totalTracks} Lagu`;
  }

  // --- 1. POPULATE POPUP / MODAL LIST ---
  if (container) {
    if (totalTracks === 0) {
      container.innerHTML = `
        <div class="text-center italic text-slate-500 text-xs py-16">
          <p>Belum ada media terdaftar.</p>
          <p class="mt-1 text-[10px]">Silakan pakai form tambah lagu di bawah untuk merancang playlist baru!</p>
        </div>
      `;
    } else {
      container.innerHTML = activeTracksList.map((track, i) => {
        const isPlaying = musicPlayingTrackId === track.id;
        let cardClass = `px-3.5 py-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 hover:bg-slate-900/60 `;
        
        if (isPlaying) {
          cardClass += 'border-emerald-500/30 bg-emerald-500/10 text-white font-bold';
        } else {
          cardClass += 'border-white/5 bg-slate-950/20 text-slate-400 hover:border-white/10';
        }

        const speakerIcon = isPlaying && musicPlayingState 
          ? '<i class="fa-solid fa-waveform animate-pulse text-emerald-400"></i>' 
          : `<span class="font-mono text-[10px] opacity-40">${i + 1}</span>`;

        let coverStyle = '';
        if (track.coverPreset === 'g-rose') coverStyle = 'from-rose-500 to-amber-500';
        else if (track.coverPreset === 'g-emerald') coverStyle = 'from-emerald-400 to-teal-700';
        else if (track.coverPreset === 'g-cyber') coverStyle = 'from-purple-600 to-blue-500';
        else coverStyle = 'from-slate-900 to-neutral-800';

        return `
          <div class="${cardClass}" onclick="window.musicPlaySelectedTrackAction('${track.id}')">
            <div class="w-8 h-8 bg-gradient-to-br ${coverStyle} rounded-lg shrink-0 flex items-center justify-center border border-white/10 relative shadow">
              <div class="absolute inset-2 rounded-full border border-white/5"></div>
              <div class="absolute inset-1.5 bg-slate-950/60 rounded-full flex items-center justify-center scale-90">${speakerIcon}</div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold ${isPlaying ? 'text-emerald-400' : 'text-slate-200'}">${track.title}</p>
              <p class="truncate text-[10px] text-slate-500 font-mono">${track.artist} • ${track.isProcedural ? 'Synth' : 'Audio'}</p>
            </div>
            <button class="text-slate-500 hover:text-red-400 shrink-0 text-xs p-1 transition-colors" onclick="event.stopPropagation(); window.musicRemoveTrackFromQueue('${track.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        `;
      }).join('');
    }
  }

  // --- 2. POPULATE INLINE PLAYLIST LIST (Next Playing inside Card) ---
  if (inlineContainer) {
    if (totalTracks === 0) {
      inlineContainer.innerHTML = `
        <div class="text-center italic text-slate-500 text-xs py-16">
          <p>Belum ada lagu.</p>
        </div>
      `;
    } else {
      inlineContainer.innerHTML = activeTracksList.map((track, i) => {
        const isPlaying = musicPlayingTrackId === track.id;
        let cardClass = `px-2 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all duration-150 hover:bg-slate-900/80 `;
        
        if (isPlaying) {
          cardClass += 'border-emerald-500/20 bg-emerald-500/5 text-white font-semibold';
        } else {
          cardClass += 'border-white/5 bg-slate-950/40 text-slate-400 hover:border-white/10';
        }

        const speakerIcon = isPlaying && musicPlayingState 
          ? '<i class="fa-solid fa-waveform animate-pulse text-emerald-400"></i>' 
          : `<span class="font-mono text-[9px] opacity-40">${i + 1}</span>`;

        let coverStyle = '';
        if (track.coverPreset === 'g-rose') coverStyle = 'from-rose-500 to-amber-500';
        else if (track.coverPreset === 'g-emerald') coverStyle = 'from-emerald-400 to-teal-700';
        else if (track.coverPreset === 'g-cyber') coverStyle = 'from-purple-600 to-blue-500';
        else coverStyle = 'from-slate-900 to-neutral-800';

        return `
          <div class="${cardClass}" onclick="window.musicPlaySelectedTrackAction('${track.id}')">
            <div class="w-6 h-6 bg-gradient-to-br ${coverStyle} rounded-md shrink-0 flex items-center justify-center border border-white/5 relative shadow">
              <div class="absolute inset-[1px] bg-slate-950/70 rounded-md flex items-center justify-center scale-95">${speakerIcon}</div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[10px] font-bold ${isPlaying ? 'text-emerald-400' : 'text-slate-200'}">${track.title}</p>
              <p class="truncate text-[9px] text-slate-500 font-mono">${track.artist}</p>
            </div>
            <button class="text-slate-600 hover:text-red-400 shrink-0 text-xs p-1 transition-colors" onclick="event.stopPropagation(); window.musicRemoveTrackFromQueue('${track.id}')" title="Hapus">
              <i class="fa-solid fa-trash-can text-[9px]"></i>
            </button>
          </div>
        `;
      }).join('');
    }
  }
}

function playSelectedTrack(trackId: string) {
  const track = activeTracksList.find(t => t.id === trackId);
  if (!track) return;

  musicPlayingTrackId = trackId;
  musicPlayingState = true;

  renderActivePlayerVisuals();
  renderMainPlaylistDomQueue();

  stopSimulatedTimer();
  stopProceduralSynthMelody();

  if (track.isProcedural) {
    bgAudioNode.pause();
    currentSimulatedTime = 0;
    
    const parsed = parseLyrics(track.lyrics);
    currentParsedLyrics = parsed;
    const maxT = parsed.length > 0 ? Math.max(...parsed.map(p => p.time)) : 0;
    simulatedDuration = maxT > 0 ? maxT + 12 : 120;

    startProceduralSynthMelody();
    startSimulatedTimer();

    window.spawnToast?.('success', 'Synth Mode Aktif 🔊', `Sintesis audio instrumental untuk lagu: ${track.title}`);
  } else {
    if (track.audioBlobUrl) {
      bgAudioNode.src = track.audioBlobUrl;
      const parsed = parseLyrics(track.lyrics);
      currentParsedLyrics = parsed;

      bgAudioNode.play().then(() => {
        window.spawnToast?.('success', 'Memulai Musik 🔊', `Trek audio lokal diaktifkan: ${track.title}`);
      }).catch(err => {
        window.spawnToast?.('error', 'Audio Diblokir', 'Silakan klik layar browser sekali untuk membuka izin pemutaran media.');
        console.error(err);
      });
    } else {
      window.spawnToast?.('warning', 'Berkas Heap Berakhir', `Pointer audio MP3 kustom "${track.title}" kedaluwarsa. Mode Fallback Synthesizer Lo-Fi diaktifkan.`);
      track.isProcedural = true;
      playSelectedTrack(trackId);
    }
  }
}

function pausePlayingMusicTrack() {
  musicPlayingState = false;
  renderActivePlayerVisuals();
  stopProceduralSynthMelody();
  stopSimulatedTimer();
  bgAudioNode.pause();
}

function startSimulatedTimer() {
  stopSimulatedTimer();
  simulatedPlaybackTimer = setInterval(() => {
    if (musicPlayingState) {
      currentSimulatedTime += 1;
      if (currentSimulatedTime >= simulatedDuration) {
        currentSimulatedTime = simulatedDuration;
        stopSimulatedTimer();
        
        // Auto Play Next
        executeNextAudioTrack(true);
      } else {
        handleTimeTicksUpdate(currentSimulatedTime, simulatedDuration);
      }
    }
  }, 1000);
}

function stopSimulatedTimer() {
  if (simulatedPlaybackTimer) {
    clearInterval(simulatedPlaybackTimer);
    simulatedPlaybackTimer = null;
  }
}

function handleTimeTicksUpdate(currentTime: number, duration: number) {
  const lblCur = document.getElementById('music-time-current');
  const lblDur = document.getElementById('music-time-duration');
  const progressSlider = document.getElementById('music-tracker-slider') as HTMLInputElement;

  if (lblCur) lblCur.textContent = formatAudioTiming(currentTime);
  if (lblDur) lblDur.textContent = formatAudioTiming(duration);

  if (progressSlider && duration) {
    progressSlider.value = ((currentTime / duration) * 100).toString();
  }

  highlightLyricsAt(currentTime);
}

function highlightLyricsAt(currentTime: number) {
  const scroller = document.getElementById('lyrics-display-scroller');
  if (!scroller || currentParsedLyrics.length === 0) return;

  let activeIdx = -1;
  for (let i = 0; i < currentParsedLyrics.length; i++) {
    if (currentTime >= currentParsedLyrics[i].time) {
      activeIdx = i;
    }
  }

  currentParsedLyrics.forEach((_, idx) => {
    const el = document.getElementById(`lyric-line-${idx}`);
    if (el) {
      if (idx === activeIdx) {
        el.className = 'lyric-line text-lg sm:text-2xl font-black text-emerald-400 py-2.5 transition-all duration-150 cursor-pointer scale-105 select-none text-glow-secondary';
      } else {
        el.className = 'lyric-line text-[15px] sm:text-xl font-medium text-slate-400 py-2 transition-all duration-150 cursor-pointer opacity-60 hover:opacity-100 hover:text-white select-none';
      }
    }
  });

  const activeLineEl = document.getElementById(`lyric-line-${activeIdx}`);
  if (activeLineEl) {
    const scrollerHeight = scroller.clientHeight;
    const elementTop = activeLineEl.offsetTop;
    const elementHeight = activeLineEl.clientHeight;
    scroller.scrollTo({
      top: elementTop - scrollerHeight / 2 + elementHeight / 2,
      behavior: 'smooth'
    });
  }
}

let proceduralSynthInterval: any = null;
function startProceduralSynthMelody() {
  stopProceduralSynthMelody();
  playProceduralLofiNotes();
  proceduralSynthInterval = setInterval(() => {
    if (musicPlayingState) {
      playProceduralLofiNotes();
    }
  }, 4000);
}

function stopProceduralSynthMelody() {
  if (proceduralSynthInterval) {
    clearInterval(proceduralSynthInterval);
    proceduralSynthInterval = null;
  }
}

function playProceduralLofiNotes() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    const chordIndex = Math.floor(currentSimulatedTime / 8) % 4;
    let freqs = [261.63, 329.63, 392.00, 493.88]; // Cmaj7
    if (chordIndex === 1) freqs = [220.00, 261.63, 329.63, 392.00]; // Am7
    else if (chordIndex === 2) freqs = [174.61, 220.00, 261.63, 329.63]; // Fmaj7
    else if (chordIndex === 3) freqs = [196.00, 246.94, 293.66, 349.23]; // G7
    
    // Lowpass filter for warm vibes
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(1.0, now);
    
    const masterGainNode = ctx.createGain();
    const playerVol = Number((document.getElementById('music-volume-slider') as HTMLInputElement)?.value || 70);
    masterGainNode.gain.setValueAtTime((playerVol / 100) * 0.08, now);
    
    filter.connect(masterGainNode);
    masterGainNode.connect(ctx.destination);
    
    // Sub bass notes
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freqs[0] / 2, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);
    subOsc.connect(subGain);
    subGain.connect(filter);
    subOsc.start(now);
    subOsc.stop(now + 4.0);

    // Soft arpeggiated lo-fi chords keys
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.15);
      
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.3);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
      
      osc.connect(oscGain);
      oscGain.connect(filter);
      
      osc.start(now);
      osc.stop(now + 4.0);
    });

    // Simulated soft analog tape static/crackle bursts
    const crackleCount = 4;
    for (let i = 0; i < crackleCount; i++) {
      const crackleTime = now + Math.random() * 3.8;
      const crackleOsc = ctx.createOscillator();
      crackleOsc.type = 'square';
      crackleOsc.frequency.setValueAtTime(100 + Math.random() * 210, crackleTime);
      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(0.012, crackleTime);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, crackleTime + 0.02);
      crackleOsc.connect(crackleGain);
      crackleGain.connect(ctx.destination);
      crackleOsc.start(crackleTime);
      crackleOsc.stop(crackleTime + 0.03);
    }
  } catch (err) {
    console.error("Synthesizer audio fail:", err);
  }
}

(window as any).musicPlaySelectedTrackAction = (trackId: string) => {
  playSelectedTrack(trackId);
  const qModal = document.getElementById('modal-playlist-queue');
  if (qModal) {
    qModal.classList.add('opacity-0', 'pointer-events-none');
  }
};

(window as any).musicRemoveTrackFromQueue = (trackId: string) => {
  const isPlayingDeleted = musicPlayingTrackId === trackId;
  const deletedTrack = activeTracksList.find(t => t.id === trackId);

  activeTracksList = activeTracksList.filter(t => t.id !== trackId);

  if (isPlayingDeleted) {
    pausePlayingMusicTrack();
    musicPlayingTrackId = null;
  }

  if (trackId.startsWith('custom-track-')) {
    const customMetadataOnly = activeTracksList.filter(t => t.id.startsWith('custom-track-')).map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      lyrics: t.lyrics,
      coverPreset: t.coverPreset,
      isProcedural: t.isProcedural,
      filename: t.filename
    }));
    localStorage.setItem('custom_tracks_metadata', JSON.stringify(customMetadataOnly));
  }

  window.spawnToast?.('warning', 'Trek Dihapus', `Lagu "${deletedTrack ? deletedTrack.title : ''}" telah dibersihkan.`);
  
  renderActivePlayerVisuals();
  renderMainPlaylistDomQueue();
};

(window as any).seekToLyricTime = (seconds: number) => {
  if (seconds < 0) return;
  const track = activeTracksList.find(t => t.id === musicPlayingTrackId);
  if (!track) return;
  if (track.isProcedural) {
    currentSimulatedTime = seconds;
    handleTimeTicksUpdate(seconds, simulatedDuration);
  } else {
    bgAudioNode.currentTime = seconds;
  }
};

function formatAudioTiming(seconds: number): string {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}


// =========================================================================
// 11. DYNAMIC SVG WEEKLY TASKS ANNOTATED CHART (Alternative to Recharts)
// =========================================================================
function drawWeeklyTasksChart() {
  const container = document.getElementById('weekly-tasks-chart-container');
  if (!container) return;

  const w = container.clientWidth || 550;
  const h = 224; // matching class height

  // Gather actual task counts by day of the week, plus base seeds for display fidelity
  const completedTaskCount = (typeof userTasks !== 'undefined') ? userTasks.filter(t => t.completed).length : 0;
  const totalTasks = (typeof userTasks !== 'undefined') ? userTasks.length : 0;
  const basePoints = [2, 3, 1, 4, 2, 5, 3];
  
  // Make the peaks reflect user's real task inputs
  const points = basePoints.map((val, idx) => {
    return val + Math.min(completedTaskCount, idx + 1);
  });

  const daysLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxVal = Math.max(...points, 8);
  const totalSegments = points.length - 1;
  const xMultiplier = (w - 60) / totalSegments;

  let svgMarkup = `
    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="opt-grad-rose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--neon-primary, #f43f5e)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--neon-primary, #f43f5e)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      
      <!-- Horizontal grid lines -->
      <line x1="30" y1="${h * 0.25}" x2="${w - 30}" y2="${h * 0.25}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2" />
      <line x1="30" y1="${h * 0.5}" x2="${w - 30}" y2="${h * 0.5}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2" />
      <line x1="30" y1="${h * 0.75}" x2="${w - 30}" y2="${h * 0.75}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2" />
  `;

  let coords = '';
  let areaCoords = `30,${h - 30} `;
  
  points.forEach((val, index) => {
    const xCoord = index * xMultiplier + 30;
    const yCoord = h - 30 - (val / maxVal) * (h - 55);
    coords += `${xCoord},${yCoord} `;
    areaCoords += `${xCoord},${yCoord} `;
    
    svgMarkup += `
      <text x="${xCoord}" y="${h - 10}" fill="rgba(255,255,255,0.4)" font-size="10" font-family="monospace" text-anchor="middle">${daysLabel[index]}</text>
      <circle cx="${xCoord}" cy="${yCoord}" r="3.5" fill="var(--neon-primary, #f43f5e)" />
      <text x="${xCoord}" y="${yCoord - 8}" fill="#ffffff" font-size="9" font-family="monospace" text-anchor="middle" font-weight="bold">${val}</text>
    `;
  });
  
  areaCoords += `${w - 30},${h - 30}`;

  svgMarkup += `
      <polygon points="${areaCoords}" fill="url(#opt-grad-rose)" />
      <polyline points="${coords}" fill="none" stroke="var(--neon-primary, #f43f5e)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;

  container.innerHTML = svgMarkup;

  const statusEl = document.getElementById('weekly-chart-status');
  if (statusEl) {
    statusEl.innerText = `${completedTaskCount} / ${totalTasks} SELESAI`;
  }
}

// Draw dynamically when window is resized for responsiveness
window.addEventListener('resize', () => {
  const panelDash = document.getElementById('panel-dashboard');
  if (panelDash && !panelDash.classList.contains('hidden')) {
    drawWeeklyTasksChart();
  }
});


// =========================================================================
// 12. HIGH-FIDELITY TUGAS (TODO-LIST) DATA ENGINE & CAROUSEL MANAGER
// =========================================================================

interface UserTask {
  id: string;
  title: string;
  date: string;
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
}

let userTasks: UserTask[] = [];

// Seed default tasks so view isn't dry on initial load
const defaultSampleTasks: UserTask[] = [
  { id: 't1', title: 'Belajar Fundamental Go WebAssembly (WASM)', date: '2026-05-30', priority: 'High', completed: false },
  { id: 't2', title: 'Melakukan Tuning Audio pada Lofi Synth', date: '2026-05-31', priority: 'Medium', completed: true },
  { id: 't3', title: 'Menulis Jurnal Logbook Mingguan', date: '2026-06-01', priority: 'Low', completed: false }
];

function initializeTugasFeatures() {
  // Load tasks
  const stored = localStorage.getItem('user_tasks');
  if (stored) {
    try {
      userTasks = JSON.parse(stored);
    } catch (e) {
      userTasks = [...defaultSampleTasks];
    }
  } else {
    userTasks = [...defaultSampleTasks];
    localStorage.setItem('user_tasks', JSON.stringify(userTasks));
  }
  
  // Bind Tasks creation buttons
  const btnAddTask = document.getElementById('tugas-btn-add');
  const inputTitle = document.getElementById('tugas-input-title') as HTMLInputElement;
  const inputDate = document.getElementById('tugas-input-date') as HTMLInputElement;
  
  // Default values
  if (inputDate) {
    const today = new Date().toISOString().split('T')[0];
    inputDate.value = today;
  }
  
  // Handle priority selector
  let selectedPriority: 'Low' | 'Medium' | 'High' = 'Low';
  const priorityBtns = document.querySelectorAll('.tugas-priority-btn');
  priorityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      priorityBtns.forEach(b => {
        b.setAttribute('class', 'tugas-priority-btn flex-1 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase text-center bg-white/5 text-slate-400 border border-white/5 cursor-pointer');
      });
      
      const p = btn.getAttribute('data-priority') as 'Low' | 'Medium' | 'High';
      selectedPriority = p || 'Low';
      
      const themeColorClass = 
        selectedPriority === 'High' ? 'bg-red-500/15 text-red-500 border-red-500/30' : 
        selectedPriority === 'Medium' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : 
        'bg-teal-500/15 text-teal-400 border-teal-500/30';
      
      btn.setAttribute('class', `tugas-priority-btn flex-1 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase text-center border cursor-pointer selected ${themeColorClass}`);
    });
  });

  // Action listeners
  btnAddTask?.addEventListener('click', () => {
    const titleVal = inputTitle?.value.trim();
    if (!titleVal) {
      window.spawnToast?.('warning', 'Validasi Gagal ⚠️', 'Harap masukkan nama tugas terlebih dahulu.');
      return;
    }

    const newTask: UserTask = {
      id: 'task_' + Date.now(),
      title: titleVal,
      date: inputDate?.value || '',
      priority: selectedPriority,
      completed: false
    };

    userTasks.push(newTask);
    localStorage.setItem('user_tasks', JSON.stringify(userTasks));
    
    if (inputTitle) inputTitle.value = '';
    
    updateTugasUI();
    updateDashboardTodoStats();
    drawWeeklyTasksChart();
    
    window.spawnToast?.('success', 'Tugas Tersimpan! ✨', `"${titleVal}" sukses ditambahkan ke agenda.`);
  });

  // Bind filter buttons
  const filterBtns = document.querySelectorAll('.tugas-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.setAttribute('class', 'tugas-filter-btn px-2 py-1 text-[9px] text-slate-400 font-extrabold uppercase cursor-pointer');
      });
      btn.setAttribute('class', 'tugas-filter-btn px-2 py-1 text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 rounded-md cursor-pointer');
      updateTugasUI();
    });
  });

  // Bind secondary signout trigger on the bottom dock
  document.getElementById('btn-signout-dock')?.addEventListener('click', () => {
    localStorage.removeItem('user_session');
    window.spawnToast?.('warning', 'Sesi Berakhir 🏮', 'Sesi handshake terputus. Silahkan login kembali.');
    setTimeout(() => window.location.reload(), 1000);
  });

  // Bind carousel indicators & slide changers
  const btnPrev = document.getElementById('hero-carousel-prev');
  const btnNext = document.getElementById('hero-carousel-next');
  
  btnPrev?.addEventListener('click', () => {
    currentHeroSlide = (currentHeroSlide - 1 + carouselSlidesData.length) % carouselSlidesData.length;
    renderHeroSlide();
  });
  
  btnNext?.addEventListener('click', () => {
    currentHeroSlide = (currentHeroSlide + 1) % carouselSlidesData.length;
    renderHeroSlide();
  });

  // Bind carousel dots manually
  document.querySelectorAll('#hero-carousel-indicators span').forEach(span => {
    span.addEventListener('click', () => {
      const targetIdx = Number(span.getAttribute('data-slide') || 0);
      currentHeroSlide = targetIdx;
      renderHeroSlide();
    });
  });

  // Initial render
  updateTugasUI();
  updateDashboardTodoStats();
  drawWeeklyTasksChart();
  renderHeroSlide();
}

const carouselSlidesData = [
  {
    title: "🎵 Pemutar Musik Lofi Lounge",
    desc: "Unggah berkas MP3 favorit Anda secara lokal atau mainkan track lofi pilihan dengan kendali volume presisi, visualisasi gelombang digital, dan timeline responsif.",
    sub: "[WASM Direct Stream Card • Buffer Optimization Enabled]",
    badge: "AUDIO SHIELD ACTIVE"
  },
  {
    title: "✍️ Aesthetic Journal Editor",
    desc: "Abadikan momen harian Anda dengan antarmuka penulisan diary berbasis mockup kertas retro bergaris, desain kotak-kokok, stardust, atau plain dark.",
    sub: "[Aesthetic Canvas Layout • Storage Sandbox Active]",
    badge: "SANDBOX SECURE"
  },
  {
    title: "📅 Interactive Calendar Planner",
    desc: "Kelola semua agenda penting dan jadwal sholat modern GMT+7 yang disinkronisasi langsung menggunakan kernel sandbox Gopher runtime super cepat.",
    sub: "[GMT+7 Scheduler Engine • Node Precision Sync]",
    badge: "WASM SPEED ACTIVE"
  }
];

let currentHeroSlide = 0;

function renderHeroSlide() {
  const container = document.getElementById('hero-carousel-viewport');
  if (!container) return;
  const slide = carouselSlidesData[currentHeroSlide];
  
  // Smooth animated transition class toggles
  container.classList.add('opacity-0', 'scale-[0.98]');
  setTimeout(() => {
    container.innerHTML = `
      <div class="relative transition-all duration-300">
        <h2 class="text-xl sm:text-2xl font-black font-display text-white tracking-tight text-glow-secondary flex items-center gap-2">
          ${slide.title}
        </h2>
        <p class="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed max-w-2xl font-body">
          ${slide.desc}
        </p>
        <p class="text-[9px] md:text-[10px] font-mono tracking-wider text-slate-500 uppercase mt-4">
          ${slide.sub}
        </p>
      </div>
    `;
    container.classList.remove('opacity-0', 'scale-[0.98]');
    
    // Update badge pill text
    const parentContainer = container.closest('.large-card');
    if (parentContainer) {
      const badgePill = parentContainer.querySelector('.bg-blue-500\\/10') as HTMLElement;
      if (badgePill) {
        badgePill.innerText = slide.badge;
      }
    }
  }, 120);

  // Update indicators
  const indicators = document.querySelectorAll('#hero-carousel-indicators span');
  indicators.forEach((ind, idx) => {
    if (idx === currentHeroSlide) {
      ind.setAttribute('class', 'w-3 h-1.5 rounded-full bg-blue-500 transition-all cursor-pointer');
    } else {
      ind.setAttribute('class', 'w-1.5 h-1.5 rounded-full bg-white/20 transition-all cursor-pointer');
    }
  });
}

function updateTugasUI() {
  const container = document.getElementById('tugas-list-items');
  if (!container) return;

  const activeBtn = document.querySelector('.tugas-filter-btn.bg-blue-500\\/10');
  const activeFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';

  let filtered = userTasks;
  if (activeFilter === 'pending') {
    filtered = userTasks.filter(t => !t.completed);
  } else if (activeFilter === 'completed') {
    filtered = userTasks.filter(t => t.completed);
  }

  // Sort: unfinished first, then priority levels, then date
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500 text-xs font-mono">
        Belum ada tugas yang sesuai kategori "${activeFilter}".
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(task => {
    const priorityClass = 
      task.priority === 'High' ? 'bg-red-500/15 text-red-500 border-red-500/20' : 
      task.priority === 'Medium' ? 'bg-amber-500/15 text-amber-500 border-amber-500/20' : 
      'bg-teal-500/15 text-teal-400 border-teal-500/20';

    return `
      <div class="flex items-center justify-between p-3.5 bg-slate-900/60 border ${task.completed ? 'border-teal-500/20 opacity-75' : 'border-white/5'} rounded-xl hover:bg-slate-900/80 transition-all group">
        <div class="flex items-center gap-3 min-w-0">
          <input type="checkbox" class="tugas-toggle-cb w-4.5 h-4.5 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer" data-id="${task.id}" ${task.completed ? 'checked' : ''} />
          <div class="min-w-0">
            <p class="text-xs font-bold text-white ${task.completed ? 'line-through text-slate-500' : ''} truncate">${task.title}</p>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${priorityClass}">${task.priority}</span>
              ${task.date ? `<span class="text-[9px] font-mono text-slate-500"><i class="fa-regular fa-calendar text-[8px] mr-1"></i> ${task.date}</span>` : ''}
            </div>
          </div>
        </div>
        <button class="tugas-delete-btn p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer" data-id="${task.id}" title="Hapus Tugas">
          <i class="fa-regular fa-trash-can text-sm"></i>
        </button>
      </div>
    `;
  }).join('');

  // Re-bind listeners for toggles and deletes
  container.querySelectorAll('.tugas-toggle-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.getAttribute('data-id');
      const task = userTasks.find(t => t.id === id);
      if (task) {
        task.completed = (e.target as HTMLInputElement).checked;
        localStorage.setItem('user_tasks', JSON.stringify(userTasks));
        updateTugasUI();
        updateDashboardTodoStats();
        drawWeeklyTasksChart();
        window.spawnToast?.('success', task.completed ? 'Tugas Selesai! 🎉' : 'Tugas Belum Selesai', `"${task.title}" disinkronisasikan.`);
      }
    });
  });

  container.querySelectorAll('.tugas-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const idx = userTasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        const title = userTasks[idx].title;
        userTasks.splice(idx, 1);
        localStorage.setItem('user_tasks', JSON.stringify(userTasks));
        updateTugasUI();
        updateDashboardTodoStats();
        drawWeeklyTasksChart();
        window.spawnToast?.('info', 'Tugas Dihapus 🗑️', `Tugas "${title}" berhasil dihapus.`);
      }
    });
  });

  // Track page badge counter
  const badge = document.getElementById('tugas-counter-badge');
  if (badge) {
    const completedCount = userTasks.filter(t => t.completed).length;
    badge.innerText = `${completedCount} Selesai`;
  }
  
  // Track home dashboard quick stats counter
  const dashCount = document.getElementById('dash-journal-count');
  if (dashCount) {
    // Let's count existing diary entries from local storage to show exact count!
    const storedDiary = localStorage.getItem('user_journals') || '[]';
    try {
      const diaries = JSON.parse(storedDiary);
      dashCount.innerText = String(diaries.length);
    } catch(err) {
      dashCount.innerText = '0';
    }
  }
}

function updateDashboardTodoStats() {
  const total = userTasks.length;
  const completed = userTasks.filter(t => t.completed).length;
  const ratioEl = document.getElementById('dash-todo-ratio');
  if (ratioEl) {
    ratioEl.innerHTML = `${completed}<span class="text-slate-500 font-medium">/${total}</span>`;
  }
}
