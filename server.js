const express = require('express');
const fs = require('fs');
const path = require('path'); // Core Node.js module for file paths
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});


const DATA_FILE = './database.json';

const saveToDb = (newData) => {
    let data = [];
    if (fs.existsSync(DATA_FILE)) {
        data = JSON.parse(fs.readFileSync(DATA_FILE));
    }
    data.push({ id: Date.now(), ...newData });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

app.post('/api/ingest', (req, res) => {
    const { title, rawContent, fileName } = req.body;
    let data = JSON.parse(fs.readFileSync(DATA_FILE));

    const newArticle = {
        id: Date.now(),
        title: title || "Untitled Article",
        summary: rawContent.substring(0, 100) + "...", // Quick summary
        steps: rawContent, // For now, rawContent is our steps
        tags: ["Logistics", "RPA"], 
        date: new Date().toISOString().split('T')[0], // Current Date
        creator: "UiPath Bot",
        status: "Draft",
        versionHistory: [{ version: 1, date: new Date(), note: "Initial Ingestion" }],
        fileName: fileName
    };

    data.push(newArticle);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(newArticle);
});

app.delete('/api/articles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    data = data.filter(a => a.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.status(204).send();
});

app.get('/api/articles', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

app.patch('/api/articles/:id/publish', (req, res) => {
    const id = parseInt(req.params.id);
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    
    const index = data.findIndex(a => a.id === id);
    if (index !== -1) {
        data[index].status = 'Published';
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(data[index]);
    } else {
        res.status(404).send('Article not found');
    }
});

app.listen(3000, () => console.log("DHL Server running at http://localhost:3000"));
