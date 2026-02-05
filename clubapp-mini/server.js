const express = require('express');
const path = require('path')
const port = 3000;
const app = express();

app.use(express.json()); 
app.use(express.static(path.join(__dirname, './dist')));
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });

