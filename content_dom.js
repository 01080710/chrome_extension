function simpleTagMonitor() {
  // 1. 硬編碼要監控的 DOM Selector
  const TARGET_SELECTOR = 'h1';

  // 2. 建立 Host 與 Shadow DOM
  const host = document.createElement('div');
  host.id = 'history-monitor-root';
  document.body.appendChild(host);
 
  const shadow = host.attachShadow({mode: 'open'});
  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        line-height: 1.4;
      }
      .box {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 999999;
        width: 280px;
        background: #1e1e24;
        color: #e4e4e7;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        border: 1px solid #3f3f46;
      }
      .btn {
        width: 100%;
        padding: 8px;
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 8px;
      }
      .btn.active { background: #dc2626; }
      .message-box {
        padding: 8px;
        background: #27272a;
        border-radius: 6px;
        border-left: 4px solid #71717a;
        margin-bottom: 8px;
        word-break: break-all;
      }
      .message-box.info { border-left-color: #3b82f6; color: #93c5fd; }
      .message-box.success { border-left-color: #22c55e; color: #86efac; }
      .message-box.error { border-left-color: #ef4444; color: #fca5a5; }
      .tag-title { font-size: 11px; opacity: 0.75; margin-bottom: 2px; }
      .log-container { max-height: 120px; overflow-y: auto; }
    </style>

    <div class="box">
      <button id="toggle-btn" class="btn">開啟監控</button>
      <div id="message-box" class="message-box">
        <div id="msg-title" class="tag-title">SYSTEM</div>
        <div id="msg-content">狀態：待命（未開啟）</div>
      </div>
      <div id="log-container" class="log-container"></div>
    </div>
  `;

  // 3. 取得 UI 元素與歷史紀錄 API 備份
  const btn = shadow.querySelector('#toggle-btn');
  const msgBox = shadow.querySelector('#message-box');
  const msgTitle = shadow.querySelector('#msg-title');
  const msgContent = shadow.querySelector('#msg-content');

  const rawPushState = window.history.pushState;
  const rawReplaceState = window.history.replaceState;
  let isMonitoring = false;
  let monitorTimer = null;
  let observer = null ;



  // 4. 定義你要輪流監控的 Target URL 列表
  const TARGET_URLS = [
    'https://www.binance.com/zh-TC/trade/BABY_USDC?type=spot',
    'https://www.binance.com/zh-TC/trade/BTC_USDT?type=spot',
    'https://www.binance.com/zh-TC/trade/ETH_USDT?type=spot',
    'https://www.binance.com/zh-TC/trade/SOL_USDT?type=spot'
  ];

  let currentUrlIndex = 0;

  // 5. 切換 URL 的核心函式 (利用 SPA 原生路由切換，不重刷頁面)
  function switchTargetURL(targetURL) {
    if (!window.location.pathname.includes('/trade/')) {
        window.location.href = targetURL;
        return;
      }

    const targetPath = targetURL.replace(window.location.origin, '');
    console.log(`🔄 準備無縫切換目標網址至: ${targetPath}`);

    // 只更新網址列，不手動 dispatchEvent
    window.history.pushState({ path: targetPath }, '', targetPath);

    // 觸發 locationchange 通知（幣安常用的輕量 Event）
    window.dispatchEvent(new Event('locationchange'));
  }


  // 6.找到對應價格url
  function labeldetect() {
    // 幣安最新價格的 DOM 標籤 (建議同時防護多種常見的 data-testid 或 Selector)
    const currentURL = window.location.href;
    const elementSelector = '.nowPrice'; // ✅ 幣安官方標籤
    const label = document.querySelector(elementSelector);
    

    if (label) {
      const textContent = label.textContent.trim();

      if (msgBox) msgBox.className = 'message-box success';
      if (msgTitle) msgTitle.textContent = `URL: ${currentURL}`;
      if (msgContent) msgContent.textContent = `最新價格: ${textContent}`;

      console.log(`[成功] 網址 [${currentURL}] 的 DOM 價格為: "${textContent}"`);
    } else {
      if (msgBox) msgBox.className = 'message-box error';
      if (msgTitle) msgTitle.textContent = `URL: ${currentURL}`;
      if (msgContent) msgContent.textContent = `❌ 未能在畫面上找到價格標籤`;

      console.warn(`[警告] 網址 [${currentURL}] 找不到價格 DOM`);
  }}

  btn.addEventListener('click',() => {
    isMonitoring = !isMonitoring
    if (isMonitoring){
      
      btn.textContent = '停止監控'
      btn.classList.add('active')
      console.log('▶️ 監控已開啟');

      const nextTargetURL = TARGET_URLS[0];
      switchTargetURL(nextTargetURL);
      console.log('目前ＵＲＬ：',nextTargetURL)
      setTimeout(() => {
        labeldetect();
      }, 2000);
      
      // 先執行一次
      // labeldetect()
      
      // 方法1 : 啟動計時器 -> 定期輪詢檢查
      // monitorTimer = setInterval(() => {
      //                   console.log('⏰ 定時檢查中...')
      //                   labeldetect()
      //                 },2000)

      // 方法2 : 啟動計時器 -> 定期輪詢檢查
      if (!observer){
        observer = new MutationObserver(() => {
            console.log('👁️ 偵測到 DOM 結構變更，觸發檢查...');
            labeldetect();
        })
      
        // 開始監控整個頁面 DOM 的變動
        observer.observe(document.body,{
           childList: true, // 子節點變動
           subtree: true   // 包含深層所有元素
        })
    
      }

    } else {
      btn.textContent = '開始監控'
      btn.classList.remove('active')

      // 方法1 : 關閉監控時，必須清除計時器，否則它會一直在背景偷跑！
      // clearInterval(monitorTimer);
      // monitorTimer = null
      // console.log('⏹️ 監控已停止，已成功清除排程')


      // 方法2 : 關閉監控時，解綁偵測器計時器，否則它會一直在背景偷跑！
      if (observer){
        observer.disconnect();
        observer = null;
        console.log('⏹️ 監控已停止，已成功切斷 DOM 觀察器');

      }
      msgBox.className = 'message-box'
      msgTitle.textContent = 'SYSTEM'
      msgContent.textContent = '狀態：待命（未開啟）'
    }

  })

};

simpleTagMonitor()

