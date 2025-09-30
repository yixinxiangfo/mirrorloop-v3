const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('MIRRORLOOP V3 - 準備中 🙏');
});

app.get('/webhook', (req, res) => {
  res.send('Webhook endpoint ready');
});

app.listen(PORT, () => {
  console.log(`MIRRORLOOP V3 running on port ${PORT}`);
});
