const express = require('express');
const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
  res.send('Hello from AussieEat backend!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
