# Changelog

本專案的重要變更都會記錄在此檔案。

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，日期使用 `YYYY-MM-DD`。

## [Unreleased]

### Planned

- 將後台共用設定改為 Vercel Edge Config 或其他永久儲存。
- API Key 繼續由 Vercel Environment Variables 管理，不傳送到前端。

### Known limitations

- Vercel 上的後台「儲存設定」目前只更新當下 Serverless 實例的記憶體，實例重啟或擴縮後可能還原。
## [0.4.0] - 2026-07-28

### Added

- 新增 `NOOK_DEFAULT_PROVIDER` 環境變數支援，可自訂全域預設 LLM 供應商 (如 `groq`, `gemini`, `openai`, `custom`)。
- 新增預設 LLM 自動檢測機制：若未設定預設 Provider 且缺乏 OpenAI Key，系統自動偵測並選用已設定 Key 的 Provider（例如僅有 `GROQ_API_KEY` 時自動將新訪客的預設模型設為 Groq）。
- 新增 `NOOK_SYSTEM_PROMPT_MIA` 與 `NOOK_SYSTEM_PROMPT_NORMAN` 角色專屬系統提示詞環境變數。
- 新增 AGPL-3.0 開源授權條款 (`LICENSE`)。

### Fixed

- 修正原本硬編碼 `NOOK_SYSTEM_PROMPT` 為 Mia 提示詞導致男角 Norman 切換時 Prompt 不符的問題。
- 修正切換角色時未將 `character` 帶給後端導致模型生成身份混淆的問題。

## [0.3.0] - 2026-07-28

### Added

- 新增 Norman 的托腮思考與舉指說明動作影格，並依聊天狀態播放不同節奏的動畫。
- 新增 Q 版 8-bit 電玩風格男角「Norman 叢林解說人」。
- 新增 Mia 與 Norman 的前台人偶切換功能。
- 新增前台 LLM Provider 切換功能。
- 新增密碼保護的管理面板，可設定人偶、Provider、Base URL、Model、System Prompt 與 API Key。
- 支援 OpenAI、Groq、Gemini，以及自訂 OpenAI-compatible API。
- 支援從 Vercel Environment Variables 讀取各 Provider 的 API Key、Base URL 與 Model。
- 新增 Bing 每日圖片背景與離線漸層備援。
- 新增 Vercel Serverless API 與 Git Remote 自動部署設定。
- 新增 Docker 與 Docker Compose 部署設定。

### Changed

- 將角色名稱從 AIKKA 全面改為 Mia。
- 將原本的 8-bit 男角重新命名為「Norman 叢林解說人」。
- 助理訊息下方的說話者名稱會跟著目前選擇的人偶切換，不再固定顯示 Mia。
- 對話輸入框提示文字會跟著目前選擇的人偶切換。
- 整理人偶資源目錄：
  - Mia：`public/nook-guide/avatars/mia/`
  - Norman：`public/nook-guide/avatars/norman/`
- 將前端 API 路徑改為適用於目前 Vercel Functions 路由的單層端點。
- 將 Git Remote 設為 `tbdavid2019/webtalk`。
- 將 `nook-xi-dusky.vercel.app` 所屬的獨立 Vercel `nook` 專案連接至 `tbdavid2019/webtalk`。

### Removed

- 移除三立相關內容、服務與文案。
- 移除 ESG 舊功能與舊版 Topic API。
- 移除 AIKKA 名稱與硬編碼歡迎文案。
- 移除 CSL、Built with CSL 與舊工程師署名。
- 移除舊版散落的人偶檔案與不再使用的角色路徑。

### Fixed

- 修正 Vercel 上 Topic API 回傳 HTTP 404 的問題。
- 修正 Runtime Config、聊天與管理面板 API 的 Vercel 路由。
- 修正切換 Norman 後，對話訊息仍顯示 Mia 的問題。
- 修正未設定個別 Provider API Key 時的狀態顯示。

## [0.2.0] - 2026-07-28

### Added

- 新增可設定的人偶與多 LLM Provider 架構。
- 新增 OpenAI-compatible Base URL 支援。

## [0.1.0] - 2026-07-28

### Added

- 建立 Vue 3、TypeScript、Vite 與 Node.js 的初始對話介面。
