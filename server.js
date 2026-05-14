const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const genAI = new GoogleGenerativeAI("AIzaSyARmT_ezGwBoILZraYGI5pPKTcNdVy2pfQ");

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

const DATA_FILE = './database.json';

// --- POST Endpoint for RPA Bot / Manual Entry ---
app.post('/api/ingest', async (req, res) => {
    try {
        const { title, fileName, rawContent } = req.body;

        // 1. Check for Duplicate (within 14 days)
        if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
        let data = JSON.parse(fs.readFileSync(DATA_FILE));

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const duplicate = data.find(a => 
            a.fileName === fileName && new Date(a.date) > fourteenDaysAgo
        );

        if (duplicate) {
            console.log(`Blocked duplicate: ${fileName}`);
            return res.status(409).json({ error: "Duplicate file within 14 days." });
        }

        // 2. AI TRANSFORMATION 
        let aiSummary = rawContent ? rawContent.substring(0, 100) + "..." : "No content";
        let aiSteps = rawContent || "No content provided";

        if (rawContent && rawContent.length > 10) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `You are a DHL Logistics expert. Summarize this SOP into a 1-sentence summary and extract the operational steps as a numbered list: ${rawContent}`;
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                aiSummary = "AI Generated: " + text.substring(0, 150) + "...";
                aiSteps = text; 
            } catch (aiErr) {
                console.error("AI processing failed, using raw content:", aiErr);
            }
        }

        // 3. Create and Save the Article
        const newArticle = {
            id: Date.now(),
            title: title || "Untitled Article",
            summary: aiSummary,
            steps: aiSteps,
            rawContent: rawContent || "",
            tags: ["Logistics", "AI-Processed"], 
            date: new Date().toISOString().split('T')[0],
            creator: fileName && fileName.includes("Manual_Entry") ? "Manual Entry" : "UiPath Bot",
            status: "Draft",
            versionHistory: [{ version: 1, date: new Date(), note: "Initial Ingestion" }],
            fileName: fileName || "manual_upload.txt"
        };

        data.push(newArticle);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        
        console.log(`Successfully added: ${newArticle.title}`);
        res.status(201).json(newArticle);

    } catch (globalErr) {
        console.error("Server Error:", globalErr);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- GET All Articles ---
app.get('/api/articles', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

// --- DELETE Article ---
app.delete('/api/articles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!fs.existsSync(DATA_FILE)) return res.status(404).send();
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    data = data.filter(a => a.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.status(204).send();
});

// --- PUBLISH Article (PATCH) ---
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

// --- EDIT Article (PUT) ---
app.put('/api/articles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { title, steps, note } = req.body;
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    
    const index = data.findIndex(a => a.id === id);
    if (index !== -1) {
        data[index].title = title;
        data[index].steps = steps;
        data[index].versionHistory.push({
            version: data[index].versionHistory.length + 1,
            date: new Date(),
            note: note || "Manual update"
        });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(data[index]);
    } else {
        res.status(404).send("Article not found");
    }
});

app.listen(3000, () => console.log("DHL Server running at http://localhost:3000"));
