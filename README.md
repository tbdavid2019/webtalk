# Nook (WebTalk)

Nook 是一個基於 Vue 3、TypeScript 與 Node.js / Vercel Serverless 的輕量級 AI 對話與助理平台。支援多種 AI 模型供應商（OpenAI、Google Gemini、Groq 以及自訂 OpenAI 相容 API），並提供內建管理面板與靈活的部署方式。

---

## 🌟 特點 (Features)

- 🤖 **多 AI 供應商支援**：整合 OpenAI (GPT-4.1-mini)、Google Gemini (Gemini 3.6 Flash)、Groq (gpt-oss-120b) 及自訂 OpenAI 相容端點。
- ⚡ **高效能前端**：採用 Vue 3 (Composition API) + Vite + TypeScript 打造極致流暢的 UI。
- 🛠️ **內建管理面板 (Admin Panel)**：提供專屬密碼驗證，可線上設定系統 Prompt、模型選擇與 API 金鑰等。
- ☁️ **一鍵 Vercel 部署**：內建 `vercel.json` 與 Serverless Function `api/[...path].mjs`，無縫接軌 Vercel 自動部署。
- 🐳 **Docker 容器化**：提供 Dockerfile 與 `compose.yaml`，輕鬆進行本地或伺服器容器化部署。

---

## 🛠️ 技術棧 (Tech Stack)

- **Frontend**: Vue 3, Vite, TypeScript, `@fontsource-variable/plus-jakarta-sans`, `@fontsource/jetbrains-mono`
- **Backend / API**: Node.js (v22+), Vercel Serverless Functions
- **Package Manager**: pnpm (v10+)

---

## 🚀 本地開發與執行 (Local Development)

### 1. 安裝依賴

需先確保本機安裝 Node.js 22+ 及 pnpm：

```bash
pnpm install
```

### 2. 環境變數設定

複製 `.env.example` 為 `.env` 並填入相關金鑰與密碼：

```bash
cp .env.example .env
```

`.env` 主要欄位說明：

```ini
PORT=18787
# 後台管理密碼（建議修改）
NOOK_ADMIN_PASSWORD=your-secure-password

# AI 供應商 API 金鑰與模型設定
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini

GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash

# 自訂 OpenAI 相容 Provider (可選)
CUSTOM_OPENAI_API_KEY=
CUSTOM_OPENAI_BASE_URL=
CUSTOM_OPENAI_MODEL=

NOOK_SYSTEM_PROMPT=You are Mia, a helpful, concise assistant.
```

### 3. 啟動開發伺服器

執行以下指令將同時啟動 Node 後端與 Vite 前端開發伺服器：

```bash
pnpm dev
```

瀏覽器造訪 `http://localhost:18787` (或 Terminal 顯示之端口) 即可開始使用。

---

## 📦 專案打包 (Build)

```bash
# 型別檢查與打包
pnpm build

# 預覽打包產物
pnpm preview
```

---

## 🐳 Docker 部署 (Docker & Docker Compose)

使用 Docker Compose 快速啟動：

```bash
docker compose up -d
```

---

## ☁️ Vercel 自動部署 (Vercel Auto-Deployment)

本專案支援連結 Git 遠端儲存庫（GitHub / GitLab / Bitbucket）實現 **Push 即自動部署**。

### 設定步驟：

1. **推送到遠端 Git 儲存庫**：
   將程式碼 Push 至你的 GitHub / GitLab / Bitbucket 儲存庫。

2. **在 Vercel 匯入專案**：
   - 登入 [Vercel Dashboard](https://vercel.com/)。
   - 點擊 **Add New...** -> **Project**。
   - 選擇並匯入（Import）你的 Nook / WebTalk 儲存庫。

3. **設定環境變數 (Environment Variables)**：
   - 在 Vercel 的專案設定頁面中，進入 **Environment Variables**。
   - 依照 `.env.example` 填入必要的金鑰（例如 `NOOK_ADMIN_PASSWORD`, `OPENAI_API_KEY`, `GEMINI_API_KEY` 等）。

4. **自動辨識設定 (`vercel.json`)**：
   Vercel 會自動讀取專案根目錄下的 `vercel.json`：
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
   - **Node.js Version**: 選擇 `22.x`

5. **自動觸發部署機制**：
   - 只要設定好 GitHub / Git Remote 連接後：
     - **Main / Master 分支 Push** ➔ 自動觸發 **Production 部署**。
     - **其他分支 Push 或 Pull Request** ➔ 自動觸發 **Preview 測試環境部署**。

---

## 📄 授權條款 (License)

Private Repository / Private License.
