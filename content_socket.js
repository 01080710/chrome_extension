async function loadUI(shadow) {

  const htmlUrl = chrome.runtime.getURL('content.html');
  const cssUrl = chrome.runtime.getURL('content.css');

  const [htmlResponse, cssResponse] = await Promise.all([fetch(htmlUrl), fetch(cssUrl)]);

  const html = await htmlResponse.text();
  const css  = await cssResponse.text();
  const style = document.createElement('style');

  style.textContent = css;

  shadow.appendChild(style);

  const template = document.createElement('div');

  template.innerHTML = html;

  while (template.firstChild) {
    shadow.appendChild(template.firstChild);
  }
}



async function CallWebsocketMonitor() {
  
  if (document.querySelector('#history-monitor-root')) return;

  // 1. 建立 Host 容器元件並掛載至 body 頁面底端,Shadow DOM (Open 模式)，隔離外部頁面 CSS 樣式影響
  const host = document.createElement('div');
  host.id = 'history-monitor-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({mode: 'open'});
  await loadUI(shadow);


  // 2. Getting Shadow DOM's endpoint & State Control
  const btn = shadow.querySelector('#toggle-btn');
  const status = shadow.querySelector('#status')
  const symbolList = shadow.querySelector('#symbol-list');
  let ws = null;            // 儲存 WebSocket 實例
  let isMonitoring = false; // 紀錄當前監控開關狀態
  let symbols = ['btcusdt','btcusdc','btcusds','btcfdusd','btcbrl','btceur','btcars','btcjpy','btcmxn','btcusd']; //貨幣對變數陣列

  // 3-1.  WebSocket Connection
  function connect() {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`).join('/');

    // 建立 WebSocket 連線 (訂閱 24hr Ticker 頻道)
    const wsUrl = `wss://stream.binance.com/stream?streams=${streams}`;
    console.log('🔌 WebSocket URL:', wsUrl);
    ws = new WebSocket(wsUrl);


    ws.onopen = () => {
      console.log('🟢 WebSocket 連線成功！');
      console.log('📡 監控 Symbols:', symbols);
      // msgTitle.textContent = `STREAM: Biance Connection...`;
    };

    let marketData = [];
    ws.onmessage = (event) => {
      
      try {
        const response = JSON.parse(event.data);
        if (!response?.data) return;

        const {s: symbol, p: price, q: quantity, T:tradeTime, E:eventTime} = response.data;

        const data = {
                      symbol: symbol,
                      price: parseFloat(price),
                      quantity: parseFloat(quantity),
                      tradeTime: new Date(tradeTime),
                      eventTime: new Date(eventTime)
                    };

        const index = marketData.findIndex(
          item => item.symbol === symbol
        );

        if (index !== -1) {
          marketData[index] = data;
        } else {
          marketData.push(data);
        }

        console.log('Market Data:', marketData);
        symbolList.innerHTML = marketData.map(item => `
          <div class="row">
            <div class="symbol">${item.symbol}</div>
            <div class="price">${item.price.toLocaleString()}</div>
            <div class="quantity">${item.quantity.toLocaleString()}</div>
            <div class="tradeTime">${item.tradeTime.toLocaleTimeString('zh-TW', { hour12: false })}</div>
            <div class="eventTime">${item.eventTime.toLocaleTimeString('zh-TW', { hour12: false })}</div>
          </div>
        `).join('');
        // symbolList.textContent = JSON.stringify(marketData);
      }
      catch (error) {
        console.error(
          '❌ Binance WebSocket parse error:',
          error
        );
      }
    };


    ws.onerror = (err) => {
      console.error('🔴 WebSocket 發生錯誤:', err);
      // msgBox.className = 'message-box error';
      // msgTitle.textContent = 'WS ERROR';
    };

    ws.onclose = () => {
      console.log('⚪ WebSocket 連線已關閉');
      if (isMonitoring) {
        // msgTitle.textContent = '重新連線中...';
        setTimeout(connect, 3000);
      }
    };
  }

  // 3-2.  WebSocket Disconnection
  function disconnect() {
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  
  // 4. 開關按鈕點擊事件監聽
  btn.addEventListener('click', () => {
    isMonitoring = !isMonitoring;

    if (isMonitoring) {
        status.classList.remove('offline');
        status.classList.add('online');
        status.textContent = '● ONLINE'
        btn.textContent = '停止監控';
        btn.classList.add('active');
        connect();
    } else {
        status.classList.remove('online');
        status.classList.add('offline');
        status.textContent = '● offline';
        btn.textContent = '開啟 WebSocket 監控';
        btn.classList.remove('active');
        disconnect();

        // msgBox.className = 'message-box';
        // msgTitle.textContent = 'WS STREAM: UNCONNECTED';
        symbolList.textContent = '--.--';
    }
  });
}


CallWebsocketMonitor();