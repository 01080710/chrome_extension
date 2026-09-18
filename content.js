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

  //// try1：按鈕開關練習
  // btn.addEventListener('click',() => {
  //   isMonitoring = !isMonitoring
  //   if (isMonitoring){
  //     btn.textContent = '停止監控'
  //     btn.classList.add('active')
  //     msgBox.className = 'message-box success'
  //     msgTitle.textContent = 'STATUS'
  //     msgContent.textContent = '監控中...';
  //   } else {
  //     btn.textContent = '開始監控'
  //     btn.classList.remove('active')
  //     msgBox.className = 'message-box'
  //     msgTitle.textContent = 'SYSTEM';
  //     msgContent.textContent = '狀態：待命（未開啟）';
  //   }

  // })


  //// try2 : 按鈕開關內步添加標籤邏輯判別(緊貼實際畫面)
  // function checkH1Tag(){
  //   const h1Element = document.querySelector('h1')
  //   if (h1Element){
  //     msgBox.className = 'message-box success';
  //     msgTitle.textContent = 'TARGET: h1';
  //     msgContent.textContent = h1Element.textContent.trim(); // 印出 h1 的文字
  //   } else {
  //     msgBox.className = 'message-box error';
  //     msgTitle.textContent = 'TARGET: h1';
  //     msgContent.textContent = '❌ 畫面上找不到 h1 標籤';
  //   }


  // }
  // btn.addEventListener('click',() => {
  //   isMonitoring = !isMonitoring
  //   if (isMonitoring){
  //     btn.textContent = '停止監控'
  //     btn.classList.add('active')
  //     checkH1Tag()
  //   } else {
  //     btn.textContent = '開始監控'
  //     btn.classList.remove('active')
  //     msgBox.className = 'message-box'
  //     msgTitle.textContent = 'SYSTEM';
  //     msgContent.textContent = '狀態：待命（未開啟）';
  //   }
  // })



  //// try3 : 按鈕開關添加標籤邏輯判別(時間梯度下去檢查)
  function labeldetect(){
    const label = document.querySelector('h1')
    if (label){
      const textContent = label.textContent.trim();
      msgBox.className = 'message-box success';
      msgTitle.textContent = 'TARGET: h1'
      msgContent.textContent = textContent
      console.log(`[成功] 找到 <h1>，內容為: "${textContent}"`);
    
    }
      else {
        msgBox.className = 'message-box error';
        msgTitle.textContent = 'TARGET: h1';
        msgContent.textContent = '❌ 未找到 h1 標籤'; 
        console.warn('[警告] 畫面上未找到 <h1> 標籤');
      }
  }

  btn.addEventListener('click',() => {
    isMonitoring = !isMonitoring
    if (isMonitoring){
      btn.textContent = '停止監控'
      btn.classList.add('active')

      console.log('▶️ 監控已開啟');

      // 先執行一次
      labeldetect()
      
      // 啟動計時器 -> 定期輪詢檢查
      monitorTimer = setInterval(() => {
                        console.log('⏰ 定時檢查中...')
                        labeldetect()
                      },2000)


    } else {
      btn.textContent = '開始監控'
      btn.classList.remove('active')

      // 關閉監控時，必須清除計時器，否則它會一直在背景偷跑！
      clearInterval(monitorTimer);
      monitorTimer = null
      console.log('⏹️ 監控已停止，已成功清除排程')

      msgBox.className = 'message-box'
      msgTitle.textContent = 'SYSTEM'
      msgContent.textContent = '狀態：待命（未開啟）'
    }

  })

};

simpleTagMonitor()

