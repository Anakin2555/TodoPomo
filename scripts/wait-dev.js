const http = require('http');

function waitForViteServer() {
  return new Promise((resolve, reject) => {
    const checkServer = () => {
      http.get('http://localhost:3002', (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(checkServer, 500);
        }
      }).on('error', () => {
        setTimeout(checkServer, 500);
      });
    };

    checkServer();
  });
}

waitForViteServer().then(() => {
  console.log('Vite server is ready, starting Electron...');
}); 