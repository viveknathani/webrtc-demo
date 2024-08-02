const HTTPS_PORT = 8443;

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

const serverConfig = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

function main() {
  const httpsServer = startHttpsServer(serverConfig);
  startWebSocketServer(httpsServer);
}

function startHttpsServer(serverConfig) {
  const handleRequest = (request, response) => {
    console.log(`request received: ${request.url}`);

    if(request.url === '/') {
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(fs.readFileSync('client/index.html'));
    } else if(request.url === '/webrtc.js') {
      response.writeHead(200, {'Content-Type': 'application/javascript'});
      response.end(fs.readFileSync('client/webrtc.js'));
    }
  };

  const httpsServer = https.createServer(serverConfig, handleRequest);
  httpsServer.listen(HTTPS_PORT, '0.0.0.0');
  return httpsServer;
}

function startWebSocketServer(httpsServer) {
  const wss = new WebSocketServer({server: httpsServer});

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      console.log(`received: ${message}`);
      wss.broadcast(message);
    });
  });

  wss.broadcast = function(data) {
    this.clients.forEach((client) => {
      if(client.readyState === WebSocket.OPEN) {
        client.send(data, {binary: false});
      }
    });
  };
}

main();
