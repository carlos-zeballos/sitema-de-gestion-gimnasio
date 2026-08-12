const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 8080;
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const dist = path.join(__dirname, 'dist', 'crm-gimnasio');

app.use('/api', createProxyMiddleware({ target: backendUrl, changeOrigin: true, pathRewrite: (pathValue) => `/api${pathValue}` }));
const socketProxy = createProxyMiddleware({ target: backendUrl, changeOrigin: true, ws: true });
app.use('/socket.io', socketProxy);
app.use(express.static(dist, { maxAge: '1d' }));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));

const server = app.listen(port, '0.0.0.0', () => console.log(`Frontend CRM disponible en puerto ${port}; API -> ${backendUrl}`));
server.on('upgrade', socketProxy.upgrade);
