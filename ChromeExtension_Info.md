# 🚀 Chrome Extension (Manifest V3)

> **摘要**：本文件為 Chrome 擴充功能開發的完整架構指南。從心智模型、核心角色分工、全域 API 工具箱，到 `content.js` 操縱 DOM 的實戰動作，協助開發者快速建立完整的運作脈絡與技術全景。

---

## 📌 目錄 (Table of Contents)

1. [💡小白速查心智地圖 (The Whole Picture)](https://www.google.com/search?q=%23-%E5%B0%8F%E7%99%BD%E9%80%9F%E6%9F%A5%E5%BF%83%E6%99%BA%E5%9C%B0%E5%9C%96-the-whole-picture)
2. [系統全貌：三個角色如何透過訊息（Message）運作？](https://www.google.com/search?q=%231-%E7%B3%BB%E7%B5%B1%E5%85%A8%E8%B2%8C%E4%B8%89%E5%80%8B%E8%A7%92%E8%89%B2%E5%A6%82%E4%BD%95%E9%80%8F%E9%81%8E%E8%A8%8A%E6%81%AFmessage%E9%81%8B%E4%BD%9C)
3. [角色分工：popup、background 與 content.js 的職責清單](https://www.google.com/search?q=%232-%E8%A7%92%E8%89%B2%E5%88%86%E5%B7%A5popupbackground-%E8%88%87-contentjs-%E7%9A%84%E8%81%B7%E8%B2%AC%E6%B8%85%E5%96%AE)
4. [能力工具箱：開發時有哪些全域物件（Global Objects）可用？](https://www.google.com/search?q=%233-%E8%83%BD%E5%8A%9B%E5%B7%A5%E5%85%B7%E7%AE%B1%E9%96%8B%E7%99%BC%E6%99%82%E6%9C%89%E5%93%AA%E4%BA%9B%E5%85%A8%E5%9F%9F%E7%89%A9%E4%BB%B6global-objects%E5%8F%AF%E7%94%A8)
5. [網頁改造指南：content.js 操縱 DOM 的 8 大動作](https://www.google.com/search?q=%234-%E7%B6%B2%E9%A0%81%E6%94%B9%E9%80%A0%E6%8C%87%E5%8D%97contentjs-%E6%93%8D%E7%B8%B1-dom-%E7%9A%84-8-%E5%A4%A7%E5%8B%95%E4%BD%9C)
6. [開發避坑與最佳實踐清單](https://www.google.com/search?q=%23-%E9%96%8B%E7%99%BC%E9%81%BF%E5%9D%91%E8%88%87%E6%9C%80%E4%BD%B3%E5%AF%A6%E8%B8%90%E6%B8%85%E5%96%AE-best-practices)



## 💡 小白速查心智地圖 (The Whole Picture)

把 Chrome Extension 想像成一個**電影拍攝團隊**：

* **`popup.js`（前台門面）**：就像**售票亭**，使用者點開按鈕才出現，負責收集使用者輸入，用完即關閉。
* **`background.js`（後台總指揮）**：就像**導演/製片**，在背景 24 小時默默運作，負責管理狀態、跨檔案協調與呼叫進階 Chrome 權限。
* **`content.js`（現場執行員）**：就像**現場道具組**，唯一能直接潛入並修改「目標網頁（DOM）」的檔案。

只要搞懂「**誰在什麼時間點，用什麼工具，去改什麼東西**」，就掌握了 Chrome Extension 的全貌！



## 1. 系統全貌：三個角色如何透過訊息（Message）運作？

因為 Chrome 基於安全性考量，將不同環境彼此**隔離**，所以三個檔案必須透過 `sendMessage`（傳訊息）來協同作業：

```text
       User Click Button
             │
             ▼
        popup.html
             │
         DOM Event
             │
             ▼
         popup.js (門面)
           │         │
           │         └───────────────┐
      操作 Popup UI             chrome.runtime.sendMessage()
                                     │
                                     ▼
                            background.js (總指揮)
                               │            │
                               │            └───────────────┐
                          chrome.tabs                 chrome.storage
                        (尋找目標分頁)                  (保存偏好設定)
                               │
                  chrome.tabs.sendMessage()
                               │
                               ▼
                            content.js (現場執行員)
                               │            │
                               │            └───────────────┐
                           document                  MutationObserver
                        (修改網頁 DOM)                 (監控頁面變更)
                               │
                               ▼
                            網頁畫面 (Page DOM)

```



## 2. 角色分工：popup、background 與 content.js 的職責清單

瞭解了運作流程後，進一步看三個核心檔案各自能拿哪些 API、做哪些事：

### 🎬 `popup.js` —— 前台門面

* **主要任務**：處理跳出視窗（Popup UI）的互動。
* **常用能力**：
* **`document`**：抓取或修改 `popup.html` 裡的按鈕與輸入框。
* **`chrome.runtime`**：把使用者在 Popup 輸入的指令傳給背景 (`sendMessage`)。
* **`chrome.storage`**：讀取或儲存使用者的偏好設定。



### 🧠 `background.js` (Service Worker) —— 後台總指揮

* **主要任務**：處理全局事件、跨分頁邏輯、長期狀態維護。
* **常用能力**：
* **`chrome.runtime`**：接收來自 `popup.js` 或 `content.js` 的訊息 (`onMessage`)。
* **`chrome.tabs`**：查詢目前打開的所有分頁，或向指定分頁發送指令。
* **`chrome.storage`**：作為擴充功能的資料中心，儲存長期狀態。
* **`chrome.scripting`**：在指定分頁中動態注入程式碼或 CSS。



### 🛠️ `content.js` —— 現場執行員

* **主要任務**：直接存取與改造「使用者正在看的那張網頁」。
* **常用能力**：
* **`document`**：直接尋找與修改目標網頁的 HTML/DOM 結構。
* **`MutationObserver`**：監控網頁畫面是不是動態刷出了新內容（SPA 必備）。
* **`Event`**：監聽使用者在目標網頁上的點擊、輸入等動作。
* **`chrome.runtime`**：回報現場狀況給背景 `background.js`。
* **`location` / `fetch**`：判斷網址與發送非同步請求。




## 3. 能力工具箱：開發時有哪些全域物件（Global Objects）可用？

寫程式時，能呼叫的工具主要來自三大來源：**JavaScript 語言原生能力**、**瀏覽器標準 Web API**，以及 **Chrome 擴充功能專屬 API**。

```text
Chrome Extension Eabled Tools 
│
├── 1. JavaScript Built-in (原生 JS 基礎能力)
│    ├─ Object         → 處理 JSON 或鍵值對（如 Object.keys()）
│    ├─ Array          → 處理元素清單（如 map, filter, forEach）
│    ├─ Promise        → 處理非同步操作（如 async / await）
│    ├─ Map / Set      → 管理狀態映射與不重複節點紀錄
│    ├─ JSON           → 資料轉字串與解析
│    └─ Date           → 計算時間戳記與執行時間
│
├── 2. Web APIs (瀏覽器賦予的網頁操作能力)
│    ├─ document       → 核心：搜尋、建立與修改 HTML DOM 元素
│    ├─ window         → 視窗控制：取得畫面寬高、監聽視窗 resize
│    ├─ location       → 網址解析：取得當前網域 (hostname) 與路徑 (pathname)
│    ├─ fetch          → 網路請求：發送 API 呼叫取得外部資料
│    ├─ MutationObserver → 動態監控：監聽網頁元素的新增或刪除
│    ├─ URL            → 網址處理：解析 Query 參數
│    └─ navigator      → 系統資訊：讀取剪貼簿 (Clipboard) 或語言設定
│
└── 3. Chrome APIs (Extension 獨有的特權能力)
     ├─ chrome.runtime   → 通訊管道：跨檔案傳送/接收 Message
     ├─ chrome.tabs      → 分頁管理：查詢與控制瀏覽器頁籤
     ├─ chrome.storage   → 資料儲存：跨環境同步/本地儲存設定
     └─ chrome.scripting → 動態注入：在特定頁面執行 JS 或插入 CSS

```



## 4. 網頁改造指南：`content.js` 操縱 DOM 的 8 大動作

`content.js` 最核心的功能就是修改目標網頁 UI，實務開發通常會遵循以下 8 個步驟：

```text
content.js 改造網頁的 8 大動作
│
├── 1. Find / Query Element (定位元素)
│    └─ querySelector() / querySelectorAll() / getElementById()
│
├── 2. Create / Insert Element (新建與插入元素)
│    ├─ createElement() + appendChild() / insertBefore()
│    └─ attachShadow() (建立 Shadow DOM，確保樣式隔離不被原網站干擾)
│
├── 3. Modify Element (修改內容)
│    └─ textContent / innerHTML / value
│
├── 4. Class / Attribute / Style (調整外觀與屬性)
│    └─ classList (add/remove) / setAttribute() / style.color
│
├── 5. Inject CSS (注入 CSS 樣式)
│    ├─ <style>  → 動態建立標籤注入 CSS 原始字串
│    └─ <link>   → 搭配 chrome.runtime.getURL('style.css') 引入套件內檔案
│
├── 6. Event Listener (監聽使用者動作)
│    └─ addEventListener()
│         ├─ click    → 點擊按鈕
│         ├─ input    → 鍵入文字
│         ├─ change   → 切換下拉選單 / Checkbox
│         ├─ submit   → 攔截表單送出
│         └─ keydown  → 觸發快捷鍵
│
├── 7. MutationObserver (監控動態渲染)
│    └─ 針對 SPA 網站，當元素非同步載入完成時，第一時間捕捉並改造
│
└── 8. Remove Element (拔除不要的元素)
     └─ element.remove() / removeChild()

```



## 🎯 開發避坑與最佳實踐清單 (Best Practices)

在實際開發 Chrome Extension 時，請務必留意以下設計原則：

1. **權限最小化原則**：在 `manifest.json` 中僅宣告必要的 `permissions` 與 `host_permissions`，能大幅降低審核退件風險與資安疑慮。
2. **無狀態背景處理（Stateless Service Worker）**：Manifest V3 的 `background.js` 屬於短暫運行的 Service Worker，隨時會被瀏覽器關閉以節省記憶體。**切勿將資料存於全域全域變數**，重要狀態請改用 `chrome.storage.local` 持久化儲存。
3. **隔離網頁樣式（Shadow DOM）**：當 `content.js` 要在第三方網頁插入自訂的 UI 元件時，建議將元素掛載於 `Shadow DOM` 內部，以避免目標網頁的原生 CSS（如 Bootstrap / Tailwind）影響你的擴充功能外觀。
4. **內容安全策略 (CSP)**：Manifest V3 嚴格限制網頁腳本執行外部程式碼（如 inline scripts 或 `eval`），若有外部 API 請求需求，建議透過 `background.js` 集中發送再傳回 `content.js`。

---

💡 **文件資訊**

* **適用版本**：Chrome Extension Manifest V3
* **文件維護**：`ChromeExtension_Info.md`