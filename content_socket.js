function setupBinanceWebsocketMonitor(symbol = 'btcusdt') {
  // 1. 檢查頁面是否已存在 UI 面板，避免重複建立 (Shadow DOM 根節點)
  if (document.querySelector('#history-monitor-root')) return;

  // 2. 建立 Host 容器元件並掛載至 body 頁面底端
  const host = document.createElement('div');
  host.id = 'history-monitor-root';
  document.body.appendChild(host);
 
  // 3. 建立 Shadow DOM (Open 模式)，隔離外部頁面 CSS 樣式影響
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      /* 全局 reset 與基礎字體設定 */
      :host { all: initial; font-family: system-ui, sans-serif; font-size: 13px; }
      
      /* 固定於畫面左下角的浮動面板樣式 */
      .box {
        position: fixed; bottom: 20px; left: 20px; z-index: 999999;
        width: 300px; background: #1e1e24; color: #e4e4e7; padding: 12px;
        border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 1px solid #3f3f46;
      }
      
      /* 控制開關按鈕樣式 (預設藍色，開啟後切換為紅色) */
      .btn {
        width: 100%; padding: 8px; background: #2563eb; color: #fff;
        border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-bottom: 8px;
      }
      .btn.active { background: #dc2626; }
      
      /* 狀態與價格顯示區域 */
      .message-box {
        padding: 8px; background: #27272a; border-radius: 6px; border-left: 4px solid #71717a;
      }
      .message-box.success { border-left-color: #22c55e; color: #86efac; } /* 連線成功 (綠邊) */
      .message-box.error { border-left-color: #ef4444; color: #fca5a5; }   /* 連線異常 (紅邊) */
      .tag-title { font-size: 11px; opacity: 0.75; margin-bottom: 2px; }
      .price { font-size: 18px; font-weight: bold; font-family: monospace; }
    </style>

    <div class="box">
      <button id="toggle-btn" class="btn">開啟 WebSocket 監控</button>
      <div id="message-box" class="message-box">
        <div id="msg-title" class="tag-title">WS STREAM: UNCONNECTED</div>
        <div id="msg-price" class="price">--.--</div>
      </div>
    </div>
  `;

  // 4. 取得 Shadow DOM 內部的 DOM 節點參考
  const btn = shadow.querySelector('#toggle-btn');
  const msgBox = shadow.querySelector('#message-box');
  const msgTitle = shadow.querySelector('#msg-title');
  const msgPrice = shadow.querySelector('#msg-price');

  // 5. 狀態控管變數
  let ws = null;           // 儲存 WebSocket 實例
  let isMonitoring = false; // 紀錄當前監控開關狀態

  // 6. 建立 WebSocket 長連線邏輯
  function connect() {
    const targetSymbol = symbol.toLowerCase();
    
    // 建立 WebSocket 連線 (訂閱 24hr Ticker 頻道)
    const wsUrl = `wss://stream.binance.com/stream?streams=${targetSymbol}@ticker`;
    ws = new WebSocket(wsUrl);

    // 握手連線成功事件
    ws.onopen = () => {
      console.log('🟢 WebSocket 連線成功！');
      msgBox.className = 'message-box success';
      msgTitle.textContent = `STREAM: ${targetSymbol.toUpperCase()} (連線中)`;
    };

    // 接收伺服器即時推送資料事件
    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log(response);

        // 確保 payload 含有正確的 data 欄位結構
        if (response && response.data) {
          // 解構數據：s 為交易對名稱, c 為當前最新成交價 (Close Price), q 為成交量
          const { s: symbol, c: price, q: quantity } = response.data;

          // 將字串價格轉為浮點數
          const numericPrice = parseFloat(price);

          // 更新 UI 面板的價格文字與千分位格式化
          const msgPrice = shadow.querySelector('#msg-price');
          if (msgPrice) {
            msgPrice.textContent = `$${numericPrice.toLocaleString()}`;
          }
        }
      } catch (err) {
        console.error('解析 WebSocket 資料失敗:', err);
      }
    };

    // 連線發生錯誤事件
    ws.onerror = (err) => {
      console.error('🔴 WebSocket 發生錯誤:', err);
      msgBox.className = 'message-box error';
      msgTitle.textContent = 'WS ERROR';
    };

    // 連線關閉事件 (包含異常中斷與手動關閉)
    ws.onclose = () => {
      console.log('⚪ WebSocket 連線已關閉');
      // 若非使用者主動停止，則觸發自動重連機制 (3 秒後重試)
      if (isMonitoring) {
        msgTitle.textContent = '重新連線中...';
        setTimeout(connect, 3000);
      }
    };
  }

  // 7. 斷開 WebSocket 連線邏輯
  function disconnect() {
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  // 8. 開關按鈕點擊事件監聽
  btn.addEventListener('click', () => {
    isMonitoring = !isMonitoring;

    if (isMonitoring) {
      // 切換至「監控中」狀態
      btn.textContent = '停止監控';
      btn.classList.add('active');
      connect();
    } else {
      // 切換至「停止監控」狀態並重置 UI
      btn.textContent = '開啟 WebSocket 監控';
      btn.classList.remove('active');
      disconnect();

      msgBox.className = 'message-box';
      msgTitle.textContent = 'WS STREAM: UNCONNECTED';
      msgPrice.textContent = '--.--';
    }
  });
}

// 執行腳本，預設監控 btcusdt
setupBinanceWebsocketMonitor(symbol = 'btcusdt');