# S09-CT 太陽能發電與電流異常監測管理系統

可直接上傳 Vercel 的純前端版本。預設使用內建模擬資料，不需要建置指令、不需要 API Key。

## Vercel 部署

### 方法 A：直接上傳
1. 登入 Vercel。
2. 建立新專案，選擇 Deploy without Git / Upload。
3. 上傳本資料夾內的全部檔案，或直接上傳 `S09-CT_Vercel_Deploy.zip`。
4. Framework Preset 選擇 `Other`。
5. Build Command、Output Directory 留空後部署。

### 方法 B：GitHub
1. 將本資料夾推送至 GitHub repository。
2. 在 Vercel Import repository。
3. Framework Preset 選擇 `Other`，不需 Build Command。

## 專案結構

- `index.html`：系統入口。
- `styles.css`：完整 RWD 介面樣式。
- `data.js`：展示用場站、設備、電流及告警資料。
- `config.js`：執行模式、API 位址、更新週期及地圖設定。
- `app.js`：頁面路由、圖表、地圖、互動與 CSV 匯出。
- `assets/NHR_Logo.png`：NHR Logo。
- `vercel.json`：Vercel 靜態網站安全標頭。

## 目前功能

- 戰情總覽：總功率、今日發電、目標達成率、預估損失、在線場站及嚴重告警。
- 場站監控：地圖、場站卡片、績效排行與下鑽。
- 發電分析：實際／預期發電、日照、七日趨勢及場站比較。
- 電流監控：L1／L2／L3、電流不平衡率、歷史曲線及通道狀態。
- 告警中心：告警篩選、確認、指派、處理中及結案狀態。
- 裝置診斷：通訊、訊號、韌體、資料完整率及最後回報。
- 報表與 ESG：發電量、CO₂ 減排、收益估算、CSV 匯出。
- 系統設定：告警門檻、電價、排放係數及資料來源分類。

## 串接真實後端

1. 在 `config.js` 將 `mode` 改為 `api`。
2. 設定 `apiBaseUrl`。
3. 系統會讀取 `${apiBaseUrl}/snapshot`，回傳結構需與 `data.js` 相同。
4. 若正式 API 欄位不同，可在 `app.js` 的 `bootstrap()` 中加入欄位映射。
5. API 無法連線時會自動退回展示資料，避免前台空白。

正式串接前需由工程端確認：
- S09-CT Payload 與通道定義。
- 電壓、功率、發電量及日照資料來源。
- 告警門檻與持續時間。
- 場站、逆變器、配電盤、裝置及 CT 通道之間的關聯。

## 外部資源

頁面使用 CDN 載入 Chart.js 與 Leaflet，部署環境需可連線至 jsDelivr。地圖使用 CARTO / OpenStreetMap 圖磚，不需要 Token。
