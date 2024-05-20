const express = require('express');
const path = require('path');

const app = express();
const PORT = 8000;

// Middleware to serve static files
app.use('/', express.static(path.join(__dirname, '../public')));
app.use('/katex.css', express.static(path.join(__dirname, '../node_modules/katex/dist/katex.css')));
app.use('/fonts', express.static(path.join(__dirname, '../node_modules/katex/dist/fonts')));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
