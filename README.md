# S09-CT 太陽能監測管理平台｜服務區展示版 太陽能監測管理平台 — Vercel RWD 版

此版本可直接部署至 Vercel，並針對桌機、平板與手機完成 RWD 調整。

## 行動版重點

- 手機底部快捷導覽：總覽、場站、電流、告警與完整選單。
- 手機專用場站篩選列與一鍵重新整理。
- 側邊選單改為行動裝置抽屜式操作。
- KPI、場站卡、電流卡、告警與設定表單自動重排。
- 表格支援橫向滑動，首欄固定，方便查閱場站與裝置名稱。
- 圖表、地圖、Modal、Toast 與安全區域適配 iPhone / Android。
- 支援瀏覽器「加入主畫面」的 Web App manifest。
- 保留桌機版完整戰情室資訊架構與功能。

## Vercel 部署

1. 解壓縮 ZIP。
2. 將整個資料夾上傳至 Vercel，或推送到 GitHub 後匯入。
3. Framework Preset 選擇 `Other`。
4. Build Command 留空。
5. Output Directory 留空。
6. 按下 Deploy。

## 正式 API 串接

編輯 `config.js`：

```js
window.S09CT_CONFIG = {
  mode: "api",
  apiBaseUrl: "https://your-api-domain.com",
  refreshSeconds: 30
};
```

系統會讀取：

```text
{apiBaseUrl}/snapshot
```

若 API 失敗，系統會自動回退至展示資料。

## 建議測試尺寸

- 手機：360 × 800、390 × 844、430 × 932
- 平板：768 × 1024、820 × 1180
- 桌機：1366 × 768、1920 × 1080


## 服務區模擬資料版本

本版本已將模擬場站更新為：西湖服務區、泰安服務區、清水服務區、西螺服務區、南投服務區；並同步調整篩選選單、告警、裝置代碼與地圖標記。


## v1.2 更新
- 修正左上 NHR Logo 的透明留白、顯示比例與尺寸。
- 移除 Logo 白色方框，改為適合深色介面的橫式品牌顯示。
