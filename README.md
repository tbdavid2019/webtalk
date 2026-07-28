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

3. **設定專案參數 (Build & Development Settings)**：
   在 **Project Settings** -> **General** 中確認以下參數：
   - **Framework Preset**: `Vite`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
   - **Node.js Version**: `22.x` (請務必選取 22.x)

4. **設定環境變數 (Environment Variables)**：
   在 **Project Settings** -> **Environment Variables** 填入所需的變數：

   | 變數名稱 (Key) | 是否必填 | 說明 / 預設值 | 範例 / 建議設定 |
   | --- | --- | --- | --- |
   | `NOOK_ADMIN_PASSWORD` | **必填** | 登入前端 Admin 面板所需的管理密碼 | `your-secure-admin-password` |
   | `OPENAI_API_KEY` | 選填 | OpenAI API 金鑰 | `sk-proj-...` |
   | `OPENAI_MODEL` | 選填 | OpenAI 預設模型 (預設 `gpt-4.1-mini`) | `gpt-4.1-mini` 或 `gpt-4o` |
   | `OPENAI_BASE_URL` | 選填 | OpenAI API Base URL | `https://api.openai.com/v1` |
   | `GEMINI_API_KEY` | 選填 | Google Gemini API 金鑰 | `AIzaSy...` |
   | `GEMINI_MODEL` | 選填 | Gemini 預設模型 (預設 `gemini-3.6-flash`) | `gemini-3.6-flash` |
   | `GEMINI_BASE_URL` | 選填 | Gemini Base URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
   | `GROQ_API_KEY` | 選填 | Groq API 金鑰 | `gsk_...` |
   | `GROQ_MODEL` | 選填 | Groq 預設模型 (預設 `openai/gpt-oss-120b`) | `openai/gpt-oss-120b` |
   | `GROQ_BASE_URL` | 選填 | Groq Base URL | `https://api.groq.com/openai/v1` |
   | `CUSTOM_OPENAI_API_KEY` | 選填 | 自訂 OpenAI 相容服務 API Key | `your-custom-key` |
   | `CUSTOM_OPENAI_BASE_URL` | 選填 | 自訂 OpenAI 相容服務 Base URL | `https://your-custom-llm.com/v1` |
   | `CUSTOM_OPENAI_MODEL` | 選填 | 自訂 OpenAI 相容服務模型名稱 | `custom-model-name` |
   | `NOOK_SYSTEM_PROMPT` | 選填 | 預設 AI 助手 Prompt / 角色設定 | `You are Mia, a helpful, concise assistant.` |

   > 💡 **提示**：`OPENAI_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY` 及 `CUSTOM_*` 建議至少設定一種 AI 供應商的金鑰，部署後才能正常呼叫模型對話。

5. **自動觸發部署機制**：
   - 只要設定好 GitHub / Git Remote 連接後：
     - **Main / Master 分支 Push** ➔ 自動觸發 **Production 部署**。
     - **其他分支 Push 或 Pull Request** ➔ 自動觸發 **Preview 測試環境部署**。

---

## 📄 授權條款 (License)

Private Repository / Private License.
