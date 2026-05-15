global.DOMMatrix = class {}; 
const express = require('express');

const fs = require('fs');
const path = require('path');
const app = express();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');

const genAI = new GoogleGenerativeAI("AIzaSyARmT_ezGwBoILZraYGI5pPKTcNdVy2pfQ");
const upload = multer({ dest: 'uploads/' });
const DATA_FILE = './database.json';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

async function processWithAI(textContent) {
    let aiSummary = "No content";
    let aiSteps = textContent || "No content provided";
    let aiTags = ["General"];

    if (textContent && textContent.length > 10) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const prompt = `Analyze this DHL SOP: "${textContent}". 
                            Perform three tasks:
                            1. CATEGORY: Pick exactly one from [Logistics, IT Support, RPA, Warehouse].
                            2. SUMMARY: A 1-sentence overview.
                            3. STEPS: A numbered list of operations.
                            
                            Format your response exactly like this:
                            CATEGORY: [Name]
                            SUMMARY: [Sentence]
                            STEPS: [List]`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const categoryMatch = text.match(/CATEGORY:\s*(.*)/i);
            const summaryMatch = text.match(/SUMMARY:\s*(.*)/i);
            const stepsMatch = text.match(/STEPS:\s*([\s\S]*)/i);

            if (categoryMatch) aiTags = [categoryMatch[1].trim()];
            if (summaryMatch) aiSummary = "AI Generated: " + summaryMatch[1].trim();
            if (stepsMatch) aiSteps = stepsMatch[1].trim();
        } catch (aiErr) {
            console.error("AI processing failed", aiErr);
        }
    }
    return { aiSummary, aiSteps, aiTags };
}

app.post('/api/upload', upload.single('articleFile'), async (req, res) => {
    try {
        const file = req.file;
        let extractedText = "";

        if (file.mimetype === "text/plain") {
            extractedText = fs.readFileSync(file.path, 'utf8');
        } else if (file.mimetype === "application/pdf") {
            const dataBuffer = fs.readFileSync(file.path);
            const options = {
                    pagerender: () => "" 
            };

            const pdfData = await pdf(dataBuffer, options);
            extractedText = pdfData.text;
            console.log("PDF Text Extracted, Length:", extractedText.length);
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ path: file.path });
            extractedText = result.value;
        }

        const aiResult = await processWithAI(extractedText);

        const newArticle = {
            id: Date.now(),
            title: file.originalname.replace(/\.[^/.]+$/, ""),
            fileName: file.originalname,
            summary: aiResult.aiSummary,
            steps: aiResult.aiSteps,
            tags: aiResult.aiTags,
            status: "Draft",
            author: "Console_User",
            date: new Date().toISOString().split('T')[0],
            versionHistory: [{ version: 1, date: new Date(), note: "Manual Upload" }]
        };

        let data = JSON.parse(fs.readFileSync(DATA_FILE) || '[]');
        data.push(newArticle);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        fs.unlinkSync(file.path); 

        res.status(201).json(newArticle);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to process upload" });
    }
});

app.post('/api/ingest', async (req, res) => {
    try {
        const { title, fileName, rawContent, rawTextContent } = req.body;
        
        if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
        let data = JSON.parse(fs.readFileSync(DATA_FILE));

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const duplicate = data.find(a => a.fileName === fileName && new Date(a.date) > fourteenDaysAgo);

        if (duplicate) return res.status(409).json({ error: "Duplicate file." });

        const aiResult = await processWithAI(rawTextContent);

        const newArticle = {
            id: Date.now(),
            title: title || "Untitled Article",
            fileName: fileName || "bot_upload.txt",
            summary: aiResult.aiSummary,
            steps: aiResult.aiSteps,
            tags: aiResult.aiTags, 
            status: "Draft",
            author: "RPA_Bot",
            date: new Date().toISOString().split('T')[0],
            versionHistory: [{ version: 1, date: new Date(), note: "Initial Ingestion" }]
        };

        data.push(newArticle);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.status(201).json(newArticle);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/articles', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

app.delete('/api/articles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    data = data.filter(a => a.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.status(204).send();
});

app.patch('/api/articles/:id/publish', (req, res) => {
    const id = parseInt(req.params.id);
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    const idx = data.findIndex(a => a.id === id);
    if (idx !== -1) {
        data[idx].status = 'Published';
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(data[idx]);
    } else res.status(404).send();
});

app.patch('/api/articles/:id/status', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    const index = data.findIndex(a => a.id === id);

    if (index !== -1) {
        const oldStatus = data[index].status;
        data[index].status = status;
        
        if (!data[index].versionHistory) data[index].versionHistory = [];
        data[index].versionHistory.push({
            version: data[index].versionHistory.length + 1,
            date: new Date(),
            note: `Status changed from ${oldStatus} to ${status}`
        });

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(data[index]);
    } else {
        res.status(404).send('Article not found');
    }
});

app.listen(3000, () => console.log("DHL Server running at http://localhost:3000"));
