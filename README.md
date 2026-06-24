## 📌 Custos

Custos is a **server-based ERP automation system** that processes SOR trace files, extracts fiber engineering data, and automatically populates ERP systems using browser automation (Playwright).

It also provides Windows shell integration for managing trace workflows directly from file explorer.

---

## 🚀 Features

* 📊 Extracts data from SOR trace files
* 📏 Calculates fiber attenuation and length metrics
* 🧠 Maps extracted data to ERP staging structure
* 🤖 Automates ERP login and form filling using Playwright
* 🌐 Local server-based processing pipeline
* 🪟 Windows shell integration (context menus & scripts)
* 📦 Installer support (Inno Setup)
* 📤 Trace posting system to local server
* ⚙️ Automated workflow execution via batch/VBS scripts

---

## 🧱 Project Structure

```
Custos/
 ├── bin/              # compiled binaries
 ├── dist/             # build output (ignored in git)
 ├── erp/              # ERP automation logic
 ├── scripts/          # automation & shell scripts
 ├── src/              # core application logic
 ├── media/            # assets
 ├── custos.iss        # installer script (Inno Setup)
 ├── package.json
 ├── tsconfig.json
```

---

## ⚙️ Scripts

Located in `/scripts`:

* `start_custos.bat` → starts local Custos server
* `stop_custos.bat` → stops service
* `post_traces.bat` → posts trace data to local server
* `launch.vbs` → silent startup launcher
* `hide_window.vbs` → hides console window
* `directories.bat` → sets up required folder structure

---

## 🧪 Workflow

1. User navigates to SOR trace directory
2. Runs `post_traces.bat`
3. Data is sent to local Custos server
4. ERP automation engine processes data
5. Playwright logs into ERP
6. System populates required stages automatically

---

## 🛠 Tech Stack

* Node.js / TypeScript
* Playwright (browser automation)
* Express (local server)
* Windows Batch + VBScript automation
* Inno Setup (installer packaging)

---

## 📦 Installation

```bash
npm install
npm run build
npm start
```

---

## 🔐 Environment Variables

```env
ERP_URL=
ERP_USERNAME=
ERP_PASSWORD=
SERVER_PORT=3000
```

---

## ⚠️ Notes

* Designed for Windows environments
* Requires ERP access credentials
* Local server must be running before posting traces

---

## 📌 Purpose

Custos automates repetitive ERP data entry for fiber engineering workflows, reducing manual processing and improving accuracy in trace-based reporting systems.
