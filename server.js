const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

mongoose.connect('mongodb://localhost:27017/solarFreezer', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const SensorData = mongoose.model('SensorData', {
  voltage: Number,
  current: Number,
  power: Number,
  chargingCurrent: Number,
  kwh: Number,
  timestamp: { type: Date, default: Date.now }
});

let clients = [];

wss.on('connection', ws => {
  clients.push(ws);
  console.log('✅ New WebSocket client connected');

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      const sensor = new SensorData(data);
      sensor.save();

      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (err) {
      console.error('Error:', err);
    }
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
  });
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/data/history', async (req, res) => {
  const data = await SensorData.find().sort({ timestamp: -1 }).limit(100);
  res.json(data);
});

server.listen(3000, () => {
  console.log('🌐 Server running at http://localhost:3000');
});
