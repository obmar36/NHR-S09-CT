# S09-CT 太陽能電流監測與維運管理平台 — Vercel 部署包

單一靜態網站，已將所有程式、模擬資料、字型與資產內嵌於 `index.html`。

## 內容
- `index.html` — 完整平台（已打包，可離線開啟；地圖圖磚與字型需連網）
- `vercel.json` — 靜態部署設定

## 部署方式（任一）

**A. Vercel 網站拖拉**
1. 登入 https://vercel.com → Add New → Project
2. 直接把這個資料夾拖入，或先推上 GitHub 再 Import
3. Framework Preset 選 **Other**（純靜態，無需 build）
4. Deploy

**B. Vercel CLI**
```bash
npm i -g vercel
cd vercel
vercel        # 預覽部署
vercel --prod # 正式部署
```

## 備註
- 中／英文切換鈕在右上角（EN / 中）。
- 地圖底圖（CARTO）與 Google Fonts 透過 CDN 載入，需網路；其餘均內嵌。
- 如需更新內容，請編輯原始 `*.dc.html` 來源後重新打包，勿直接改 `index.html`。
