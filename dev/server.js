import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dev/server.js
// 所以 extension 根目錄是 dev 的上一層
const extensionRoot = path.resolve(__dirname, '..');

const PORT = 35729;

// 建立 HTTP Server
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*'
  });

  res.end('DOM Safety Guard Dev Server');
});

// 建立 WebSocket Server
const wss = new WebSocketServer({
  server
});

wss.on('connection', socket => {
  console.log('🔌 Chrome Extension 已連線');

  socket.send(JSON.stringify({
    type: 'connected'
  }));

  socket.on('close', () => {
    console.log('🔌 Chrome Extension 已離線');
  });
});

// 廣播訊息給 Chrome Extension
function broadcast(message) {
  const data = JSON.stringify(message);

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

// 監控 Extension 檔案
const watcher = chokidar.watch(
  [
    path.join(extensionRoot, 'manifest.json'),
    path.join(extensionRoot, 'content.js'),
    path.join(extensionRoot, 'popup.js'),
    path.join(extensionRoot, 'popup.html')
  ],
  {
    ignoreInitial: true
  }
);

watcher.on('all', (event, filePath) => {
  const relativePath = path.relative(
    extensionRoot,
    filePath
  );

  console.log(
    `\n📝 ${event}: ${relativePath}`
  );

  console.log('🔄 通知 Chrome Extension Reload...');

  broadcast({
    type: 'reload',
    file: relativePath,
    event
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('🛡️ DOM Safety Guard Dev Server');
  console.log('========================================');
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`📁 Watching: ${extensionRoot}`);
  console.log('');
  console.log('等待檔案變更...');
});
