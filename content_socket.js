async function readCSV(url) {
  const response = await fetch(url);
  const csvText = await response.text();

  return new Promise((resolve, reject) => {

      Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,

      complete: (results) => {
        resolve(results.data);
      },

      error: (error) => {
        reject(error);
      }
    });
  });
}



async function loadUI(shadow) {

  const htmlUrl = chrome.runtime.getURL('content.html');
  const cssUrl  = chrome.runtime.getURL('content.css');
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
  const btn        = shadow.querySelector('#toggle-btn');
  const status     = shadow.querySelector('#status')
  const symbolList = shadow.querySelector('#symbol-list');
  let ws = null;            
  let isMonitoring = false; 
  let symbols = ['btcusdt','btcusdc','btcusds','btcfdusd','btcbrl','btceur','btcars','btcjpy','btcmxn','btcusd']; //貨幣對變數陣列


  // 3-1.  WebSocket Connection
  function connect() {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`).join('/');
  
    // console.log('Resign Streaming:', streams)
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
        const response = JSON.parse(event.data) 
        if (!response?.data) return;

        const {s: symbol, p: price, q: quantity, T:tradeTime, E:eventTime} = response.data;
        const data = {symbol: symbol,
                      price   : parseFloat(price),
                      quantity: parseFloat(quantity),
                      tradeTime: new Date(tradeTime),
                      eventTime: new Date(eventTime)
                    };
                      
        // 這邊撰寫一個比對邏輯，判別symbol是否存在於marketData中，若存在則更新；若不存在則新增
        // 以findIndex語法來說找的到是給對應">= 0"之index;但若找不到給"-1"
        const index = marketData.findIndex(item => item.symbol === symbol);
        index >= 0 ? marketData[index]= data : marketData.push(data) // 善用三元運算子可以讓程式碼更精簡
        

        symbolList.innerHTML = marketData.map(item => `
            <div class="row">
              <div class="symbol">${item.symbol}</div>
              <div class="price">${item.price.toLocaleString()}</div>
              <div class="quantity">${item.quantity.toLocaleString()}</div>
              <div class="tradeTime">${item.tradeTime.toLocaleTimeString('zh-TW', {hour12: false})}</div>
              <div class="eventTime">${item.eventTime.toLocaleTimeString('zh-TW', {hour12: false})}</div>
            </div>
          `).join('');
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

  // 4. Trigger Logic
  function startMonitoring(){
      if (!isMonitoring) return;
      isMonitoring = true;
      status.classList.remove('offline');
      status.classList.add('online');
      status.textContent = '● ONLINE'
      btn.textContent = '停止監控';
      btn.classList.add('active');
      connect();
  }

  function stopMonitoring(){
      if (isMonitoring) return;
      isMonitoring = false;
      status.classList.remove('online');
      status.classList.add('offline');
      status.textContent = '● OFFLINE';
      btn.textContent = '開啟 WebSocket 監控';
      btn.classList.remove('active');
      disconnect();

      symbolList.textContent = '--.--';
  }

  // The logicical is varifield -1.
  btn.addEventListener('click', () => {
      isMonitoring = !isMonitoring;
      if (isMonitoring) {
          startMonitoring()
      } else {
          stopMonitoring()
    }
  });
  
  // The logical is also varifield -2.
  document.addEventListener('keydown', (event) => {
    isMonitoring = !isMonitoring;
    if (event.key.toLowerCase() === 'o') {
      host.style.display = 'block';
    }
    if (event.key.toLowerCase() === 'c') {
      host.style.display = 'none';
      stopMonitoring();
    }

  });

}





// fetch(chrome.runtime.getURL("data/DavinciReport_ASIC.csv"))
//   .then(res => res.text())
//   .then(csv => {
//     const firstLine = csv.split(/\r?\n/)[1];
//     console.log(firstLine);
//   })
//   .catch(console.error);


CallWebsocketMonitor();