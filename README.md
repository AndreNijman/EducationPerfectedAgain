# 🎓 SimplyPerfected
<p align="top">
  <img src="result.png" alt="Bot Screenshot" />
</p>

---

## 📘 Overview
> [!CAUTION]
> Multi‑word terms in the target language can still confuse the Education Perfect audio tasks. Refresh whenever you swap lists or learning modes.

**SimplyPerfected** is a Puppeteer-powered helper for [Education Perfect](https://www.educationperfect.com/) that captures vocab lists, listens for audio prompts, and submits answers on your behalf. The in-task control panel now shows live stats, mode indicators, shortcut hints, and learning feedback so you always know what the bot is doing.

### Key features
- 🚀 Instant, Semi-auto, and Delayed answering modes with one-click switching
- 🧠 Auto-learning: wrong answers are added to the dictionary immediately
- 🔊 Audio mapping for listening/dictation style questions
- 🧮 Panel stats showing entry counts, audio coverage, and last refresh time
- 🎛️ Compact floating UI with hide/show toggle and keyboard shortcuts

---

## 🧩 Requirements
- Windows 10/11 or any OS that can run Node.js + Chromium
- [Node.js](https://nodejs.org/) 18+ (needed for Puppeteer)
- A valid Education Perfect login with access to vocab tasks

---

## 🛠 Installation
1. **Clone the repo**: `git clone https://github.com/AndreNijman/EducationPerfectedAgain.git && cd EducationPerfectedAgain`
2. **Install dependencies** (first run only): `npm install`
3. On Windows, you can still run `install.cmd` if you prefer a one-click setup—it simply runs `npm install` for you.
4. Launch the bot with `SimplyPerfected.cmd` (Windows) or `node simplyperfected.js` (any platform).

> If you prefer running from source, install dependencies with `npm install` and run `node simplyperfected.js`.

---

## ▶️ Usage Workflow
1. Open an Education Perfect vocab/listening task in Chromium (the bot launches Chrome automatically).
2. In the task UI, **pick the Education Perfect learning mode** (Reading, Dictation, Listening, etc.).
3. Wait for the SimplyPerfected control panel to appear in the top-right corner.
4. Press **Refresh** (`Alt+R`) to capture the current word list and audio map.
5. Select your answering mode (⚡ Instant, ⏸️ Semi, ⏱️ Delay).
6. Hit **Start** (`Alt+S`). The status chip turns green and the bot begins answering.
7. Whenever you change lists, switch learning modes, or notice mismatches, press Refresh again.
8. Use the hide (✕) button if the panel gets in the way; the 📋 button restores it.

---

## 🖥️ Control Panel Cheat Sheet

| Icon/Button | Action | Notes |
|-------------|--------|-------|
| 🔄 Refresh  | Rebuilds the dictionary + audio cache | Panel highlights briefly when complete |
| ▶️ Start / ⏹️ Stop | Toggles the answering loop | Status chip shows Idle/Running |
| ⚡ Instant  | Submit immediately after typing | Best for text-only modes |
| ⏸️ Semi-auto | Wait for you to press Enter | Manual pacing, safest for audio ambiguity |
| ⏱️ Delay   | Adds a small random pause before Enter | Mimics human timing |
| ✕ / 📋     | Hide or show the floating panel | Useful on smaller displays |

### Keyboard shortcuts

| Shortcut | What it does |
|----------|--------------|
| `Alt + R` | Refresh word and audio lists |
| `Alt + S` | Start/stop the bot |
| `Alt + 1` | Select Instant mode |
| `Alt + 2` | Select Semi-auto mode |
| `Alt + 3` | Select Delayed mode |

---

## 🧪 Tips & Troubleshooting
- **Missed answer after a mistake?** The bot now rereads the correction modal automatically. If it still pauses, press Start again to resume, then Refresh.
- **Audio not mapping?** Ensure your task has the preview grid with speaker icons visible. Refresh after toggling list filters.
- **Chromium blocked by policies?** Launch the script as admin or specify a Puppeteer executable path in `simplyperfected.js`.
- **Panel not showing?** Wait for the Education Perfect task to load fully, or reload the page—`page.on('load', initPanel)` re-injects the UI.

---

## ✍️ Authors
- **André Nijman** – original author
- **Cyclate (JustSoftware)** – co-author, refactors, and UI polish

---

## ⚖️ Disclaimer
This repository is for **educational and research purposes only**. By running SimplyPerfected you agree that:

- ❌ The authors are **not responsible** for how you use this software.
- ❌ Any breach of Education Perfect’s terms of service or academic policies is **your responsibility**.
- ✅ Use the project to study Puppeteer automation, UI overlays, and Node.js scripting—not to gain unfair academic advantage.

Be respectful of the platforms you interact with and comply with local regulations, school policies, and ethical guidelines.
