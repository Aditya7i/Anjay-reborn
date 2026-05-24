# 🏮 Gopher WASM & ANJAY Reborn Dashboard

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-30.0-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![Go](https://img.shields.io/badge/Go_WASM-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

A highly polished, multi-themed developer dashboard engineered with high-performance **Go WebAssembly (WASM)**, dynamic responsive design, local music playback, and local history management. This project can be served as a modern single-page web app or shipped directly to Windows/macOS/Linux as a native desktop application using Electron.js.

---

## ✨ Core Features

-   **⚙️ Go WebAssembly (WASM) Engine:** Powered by Go compiler logic to handle back-end calculations directly inside the client sandbox at near-native speeds.
-   **🎵 Local Music Player:** Features a zero-latency audio engine supporting manual queue loading, playlist uploads, next/prev tracking, and continuous background music playback (lifted audio node state).
-   **🎨 Dynamic Neon Glow & Custom Themes:** Custom styling engine employing Tailwind and CSS Variables to trigger real-time ambient neon-glow accents adjusted with custom themes.
-   **✍️ Aesthetic Book-Style Diary:** Implements a dynamic paper sheet journaling editor with live custom fonts (sans/serif/cursive) and realistic ruled/grid/stardust paper mockups. Incorporates secure Guest Mode write safeguards.
-   **📅 WASM-Powered Calendar:** Keep and confirm agendas in a responsive calendar grid computed by the central compiler logic.
-   **🖥️ Desktop Native Executable:** Seamlessly bundled with Electron.js supporting context isolation, customizable menus, preloaded sandbox wrappers, and instant installer production.

---

## 🛠️ Technology Stack

-   **Frontend:** React 19 (TypeScript), Tailwind CSS.
-   **Layout & Motion:** Motion (Framer Motion) for natural, fluid transition physics.
-   **Core Engines:** WebAudio API, LocalStorage persistence, Custom Go WebAssembly handlers.
-   **Desktop Wrapping:** Electron.js, Electron Builder.

---

## 🚀 Getting Started

### 📦 Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 🔌 Standard Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/gopher-wasm-dashboard.git
   cd gopher-wasm-dashboard