# 🧩 Chrome Extension 核心選材與架構設計指南
> **Chrome Extension Architecture & Tech Stack Selection Guide (Manifest V3)**

![Chrome Extension](https://img.shields.io/badge/Manifest-V3-blue.svg)
![Architecture](https://img.shields.io/badge/Architecture-Enterprise-green.svg)
![JavaScript](https://img.shields.io/badge/Language-JS%2FTS-yellow.svg)


## 📖 關於本指南

本指南旨在為 Chrome Extension 開發者提供一套系統化的**架構選材與職責切割標準**。
透過「**執行維度 (Who)**」與「**資料生命週期 (Lifetime)**」兩大核心軸線，協助團隊在開發新功能時，快速且嚴謹地解答以下兩個核心問題：

1. **程式碼該寫在哪裡？** (`popup` / `content` / `background`)
2. **資料該如何傳遞與儲存？** (`Memory` / `session` / `local` / `sync`)



## 📌 核心二維選材矩陣 (Selection Matrix)

| 處理維度 (Dimension) | 權責角色 (Component) | 核心職責 (Core Responsibilities) | 暫時性資料 (Transient Data) | 永久性資料 (Persistent Data) |
| :--- | :--- | :--- | :--- | :--- |
| **① 人工操作**<br>`User Interaction` | `popup.html`<br>`popup.js`<br>`options.js` | • 使用者點擊/輸入/設定<br>• 手動傳參與開關控制<br>• 即時 UI 狀態與結果展示 | • Input values<br>• Loading 狀態<br>• 當次操作 UI state | • 使用者偏好設定<br>• Extension 核心配置<br>• API 金鑰/存取 Token |
| **② 網頁操作**<br>`Web DOM` | `content.js` | • 查詢與修改 DOM 結構<br>• 讀取網頁文字/CSS 修改<br>• 監聽網頁事件與高亮 | • 當前頁面抓取資料<br>• 頁面 DOM 暫存狀態<br>• 當次解析結果 | • 使用者自訂網頁標記<br>• 網頁結構分析歷史紀錄 |
| **③ 瀏覽器/擴充套件層**<br>`Browser / OS` | `background.js`<br>*(Service Worker)* | • Tab / Window 狀態管理<br>• Extension 生命週期與 Alarms<br>• 右鍵選單與 Message Routing | • 任務執行進度/狀態<br>• Message 中轉暫存<br>• 運算中間結果 | • 系統層級任務歷史<br>• 跨分頁共用全域狀態 |
| **④ 外部 API**<br>`External API` | `background.js`<br>*(優先建議)* | • Fetch REST API<br>• AI Model API 調用<br>• Backend 資料同步 | • API Request / Response<br>• 暫存連線 Token | • 儲存至 `chrome.storage`<br>• 同步至遠端資料庫 (DB) |



## 🛡️ 嚴謹選材架構決策維度 (Enterprise Architectural Dimensions)

除了基礎權責分工外，大型或商業級專案必須遵循以下四個工程限制維度：



```
                          ┌────────────────────────┐
                          │ Extension Architecture │
                          └───────────┬────────────┘
                                      │
┌───────────────────────┬─────────────┴─────────┬────────────────────────┐
▼                       ▼                       ▼                        ▼
┌───────────────┐   ┌───────────────┐       ┌───────────────┐        ┌───────────────┐
│ Security &    │   │ Execution     │       │ SW Lifecycle  │        │ Storage &     │
│ Permissions   │   │ Environments  │       │ Constraints   │        │ Resource      │
│ (權限與安全)   │   │ (執行環境隔離)│       │ (SW 生命週期) │        │ (資源與限流)  │
└───────────────┘   └───────────────┘       └───────────────┘        └───────────────┘

```

### 1. 安全性與權限邊界 (Security Boundaries & CSP)
* **API Secrets / Keys 宣告**：
  * ❌ **禁止** 放在 `content.js`（避免網頁腳本經由 DOM / Prototype 竊取）或 `popup.js`（易被前端解包）。
  * ✅ **必須** 放在 `background.js` 或由後端 API 代理。
* **CORS 請求與 Host Permissions**：
  * ❌ **避免** 於 `content.js` 發起跨域請求（受限於目標網頁的 Page CSP 與 CORS 政策）。
  * ✅ **必須** 於 `manifest.json` 宣告 `host_permissions` 後，統一由 `background.js` 發起 `fetch`。
* **動態程式碼防範**：嚴格禁止 `eval()` 或遠端加載未打包的 JS 檔案。



### 2. 執行環境與上下文隔離 (Isolation Models)

```
[ Target Web Page ]
├── Main World (網頁原生 JS 空間, 如 window.React)
└── Isolated World (content.js 隔離空間) ─── 共用 DOM 結構
```

* **`content.js` (Isolated World - 預設)**：可存取 DOM 及部分 `chrome.*` API，但無法存取網頁本身的原生 JS 全域變數。
* **`content.js` (Main World)**：當需要讀取或改寫網頁原生的全域變數（如 `window.myAppStore`）時，須透過宣告 `world: "MAIN"` 注入。
* **架構建議**：保持 `content.js` 為 **Thin Client（極輕量）**，僅負責 DOM 抓取與事件發送，將數據清洗、複雜計算等運算全部移交 `background.js`。



### 3. Service Worker 無狀態與生命週期限制 (Stateless SW Architecture)

Manifest V3 的 `background.js` 運作於 Service Worker，當系統閒置約 30 秒後即會被 Chrome 強制銷毀休眠。

* **絕不使用全域變數保存 State**：
  ```javascript
  // ❌ 錯誤：SW 重啟後全域變數會恢復預設值（資料遺失）
  let globalSession = {}; 

  // ✅ 正確：統一讀寫持久化或 Session 儲存區
  await chrome.storage.session.set({ globalSession });
  ```

* **Event Listener 必須「同步頂層註冊」**：所有 `chrome.runtime.onMessage`、`chrome.alarms.onAlarm` 等監聽器必須在 `background.js` 檔案頂層（Top-Level）同步完成註冊，不可寫在非同步 Callback 內部。
* **長時與定時任務**：定時觸發必須使用 `chrome.alarms`（`setInterval` 會在 SW 休眠後失效）。



### 4. 儲存管道配額與寫入限流 (Storage Quotas & Performance)

```
                              ┌────────────────────────┐
                              │  chrome.storage 選材  │
                              └───────────┬────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
│     .sync       │              │     .local      │              │    .session     │
├─────────────────┤              ├─────────────────┤              ├─────────────────┤
│ • 容量：100 KB  │              │ • 容量：10 MB   │              │ • 容量：10 MB   │
│ • 單筆：8 KB     │              │   (Unlimited)   │              │ • 寫入：極快    │
│ • 限流：120次/分│              │ • 寫入：中等    │              │ • 關閉瀏覽器銷毀│
└────────┬────────┘              └────────┬────────┘              └────────┬────────┘
         │                                │                                │
         ▼                                ▼                                ▼
  [ 使用者偏好設定 ]               [ 歷史紀錄 / 快取 ]              [ 敏感 Token / State ]


```
* **高頻寫入限流**：`chrome.storage.sync` 設有每分鐘 120 次的寫入上限。禁止在 `scroll`、`input` 等高頻觸發事件中直接寫入；應先在記憶體中進行防抖 (Debounce) 或暫存至 `chrome.storage.session`。


## ⏳ 資料生命週期分類 (Data Lifetime Model)

根據資料保留的時間長短與存取需求，選擇最合適的儲存管道：

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Data Lifetime                             │
└────────────────────────────────────────────────────────────────────────┘
   │
   ├─► 【暫時性 - Transient】
   │     └── Memory (JS Local Variable) ➔ Message Passing
   │           • 適用：單次 Function 運算、UI Loading 狀態、任務結束即銷毀
   │
   ├─► 【短期持續 - Session】
   │     └── chrome.storage.session
   │           • 適用：Session 狀態、暫時性跨頁面/跨 Tab 資料 (關閉瀏覽器即清空)
   │
   ├─► 【永久性 - Persistent Local】
   │     └── chrome.storage.local
   │           • 適用：歷史紀錄、大量資料快取、單機偏好設定 (預設容量 10MB)
   │
   └─► 【跨裝置同步 - Sync】
         └── chrome.storage.sync
               • 適用：使用者個人偏好設定、少量 Key-Value 配置 (總容量受限 100KB)

```



## 🔄 數據流動與組件通訊架構 (Data Flow Architecture)

```
[ User Action ]
      │
      ▼
┌───────────┐         Message Passing         ┌───────────────┐
│ popup.js  │ ──────────────────────────────► │ background.js │
└───────────┘                                 └───────┬───────┘
                                                      │
┌───────────┐         Message Passing                 │
│content.js │ ◄───────────────────────────────────────┘
└─────┬─────┘
      │
      ▼
┌───────────┐
│ Web DOM   │
└───────────┘

```

### 通訊職責分工：

1. **`popup.js` ➔ `background.js**`：發送使用者操作指令（例如：開啟批次任務、更新 API 配置）。
2. **`content.js` ➔ `background.js**`：傳送從 DOM 擷取的網頁資料、請求發起第三方 API。
3. **`background.js` ➔ `chrome.storage**`：統一處理資料持久化寫入與讀取，作為單一事實來源 (Single Source of Truth)。



## 📋 嚴謹選材架構審查 CheckList

請對照以下清單進行架構與選材確認：

```markdown
- [ ] 1. 【職責定位】 程式碼是否放在正確元件？(DOM 處理 ➔ content / 業務與 API ➔ background / 介面 ➔ popup)
- [ ] 2. 【安全性】 API Secrets 與連線憑證是否已完全移出 content.js 與 popup.js？
- [ ] 3. 【安全性】 跨網域 API 請求是否統一由 Service Worker (background.js) 發起？
- [ ] 4. 【無狀態性】 Service Worker 內是否完全沒有依賴全域變數作為狀態儲存？
- [ ] 5. 【事件註冊】 所有的 Event Listener 是否都在 background.js 頂層同步完成註冊？
- [ ] 6. 【隔離性】 content.js 是否保持 Thin Client（無巨型第三方套件，僅做 DOM 解析）？
- [ ] 7. 【儲存限流】 是否避免在高頻事件 (Scroll/Input) 中直接寫入 storage.sync 或 storage.local？
- [ ] 8. 【定時任務】 背景定時任務是否全數使用 chrome.alarms 替代 setInterval/setTimeout？

```

