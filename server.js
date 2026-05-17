global.DOMMatrix = class {};
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');

const app = express();
let genAI = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
} catch (err) {
  console.warn('Google Generative AI client unavailable, using fallback AI processing:', err.message || err);
}
const DATA_FILE = path.join(__dirname, 'database.json');
const USER_FILE = path.join(__dirname, 'user.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

const upload = multer({ dest: UPLOAD_DIR });
const publicPath = path.join(__dirname, 'public');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));

app.use(express.static(publicPath));

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
  return JSON.parse(raw);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

function loadUsers() {
  if (!fs.existsSync(USER_FILE)) return [];
  const raw = fs.readFileSync(USER_FILE, 'utf8') || '[]';
  return JSON.parse(raw);
}

function buildArticle({ title, fileName, summary, steps, tags, author, note }) {
  const now = new Date();
  return {
    id: Date.now(),
    title,
    fileName,
    summary,
    steps,
    tags,
    status: 'Draft',
    author: author || 'Unknown User',
    date: formatDate(now),
    createdAt: now.toISOString(),
    versionHistory: [{ version: 1, date: now, note }]
  };
}

async function processWithAI(textContent) {
  console.log('processWithAI: called, text length=', textContent ? textContent.length : 0);
  if (textContent && textContent.length > 120) {
    console.log('processWithAI: preview ->', textContent.slice(0, 120).replace(/\s+/g, ' '));
  }
  let aiSummary = 'No content';
  let aiSteps = textContent || 'No content provided';
  let aiTags = ['General'];

  if (!textContent || textContent.length <= 10) {
    return { aiSummary, aiSteps, aiTags };
  }

  if (!genAI) {
    const normalizedText = textContent.replace(/\s+/g, ' ').trim();
    const firstSentence = normalizedText.split(/\.\s+/)[0].slice(0, 120);
    aiSummary = `(Auto) ${firstSentence}${firstSentence.endsWith('.') ? '' : '...'}`;
    aiSteps = textContent.trim();
    const textLower = textContent.toLowerCase();

    if (textLower.includes('logistic') || textLower.includes('shipment') || textLower.includes('delivery')) {
      aiTags = ['Logistics'];
    } else if (textLower.includes('it support') || textLower.includes('ticket') || textLower.includes('system')) {
      aiTags = ['IT Support'];
    } else if (textLower.includes('rpa') || textLower.includes('robot') || textLower.includes('automation')) {
      aiTags = ['RPA'];
    } else if (textLower.includes('warehouse') || textLower.includes('storage') || textLower.includes('inventory')) {
      aiTags = ['Warehouse'];
    }

    console.log('processWithAI: using fallback AI -- tags=', aiTags);
    return { aiSummary, aiSteps, aiTags };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const prompt = `Analyze this DHL SOP: "${textContent}".\nPerform three tasks:\n1. CATEGORY: Pick exactly one from [Logistics, IT Support, RPA, Warehouse, General].\n2. SUMMARY: A 1-sentence overview.\n3. STEPS: A numbered list of operations.\n\nFormat your response exactly like this:\nCATEGORY: [Name]\nSUMMARY: [Sentence]\nSTEPS: [List]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const categoryMatch = text.match(/CATEGORY:\s*(.*)/i);
    const summaryMatch = text.match(/SUMMARY:\s*(.*)/i);
    const stepsMatch = text.match(/STEPS:\s*([\s\S]*)/i);

    if (categoryMatch) aiTags = [categoryMatch[1].trim()];
    if (summaryMatch) aiSummary = `${summaryMatch[1].trim()}`;
    if (stepsMatch) aiSteps = stepsMatch[1].trim();
  } catch (aiErr) {
    console.error('AI processing failed', aiErr);
    const normalizedText = textContent.replace(/\s+/g, ' ').trim();
    const firstSentence = normalizedText.split(/\.\s+/)[0].slice(0, 120);
    aiSummary = `(Auto) ${firstSentence}${firstSentence.endsWith('.') ? '' : '...'}`;
    aiSteps = textContent.trim();
  }
  console.log('processWithAI: produced summary length=', aiSummary.length, 'steps length=', aiSteps ? aiSteps.length : 0);
  return { aiSummary, aiSteps, aiTags };
}


app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = loadUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    res.status(200).json({
      success: true,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/upload', upload.single('articleFile'), async (req, res) => {
  try {
    const file = req.file;
    let extractedText = '';

    switch (file.mimetype) {
      case 'text/plain':
        extractedText = fs.readFileSync(file.path, 'utf8');
        break;
      case 'application/pdf': {
        const dataBuffer = fs.readFileSync(file.path);
        const options = { pagerender: () => '' };
        const pdfData = await pdf(dataBuffer, options);
        extractedText = pdfData.text;
        console.log('PDF Text Extracted, Length:', extractedText.length);
        break;
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const result = await mammoth.extractRawText({ path: file.path });
        extractedText = result.value;
        break;
      }
      default:
        extractedText = '';
    }

    const aiResult = await processWithAI(extractedText);
    const author = typeof req.body.author === 'string' && req.body.author.trim() ? req.body.author.trim() : 'Console_User';
    const newArticle = buildArticle({
      title: file.originalname.replace(/\.[^/.]+$/, ''),
      fileName: file.originalname,
      summary: aiResult.aiSummary,
      steps: aiResult.aiSteps,
      tags: aiResult.aiTags,
      author,
      note: 'Manual Upload'
    });

    const data = loadData();
    data.push(newArticle);
    saveData(data);
    fs.unlinkSync(file.path);

    res.status(201).json(newArticle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

app.post('/api/ingest', async (req, res) => {
  try {
    const { title, fileName, rawTextContent, tags } = req.body;
    const data = loadData();

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const duplicate = data.find(a => a.fileName === fileName && new Date(a.date) > fourteenDaysAgo);

    if (duplicate) {
      return res.status(409).json({ error: 'Duplicate file.' });
    }

    const aiResult = await processWithAI(rawTextContent);
    const author = typeof req.body.author === 'string' && req.body.author.trim() ? req.body.author.trim() : 'Unknown User';
    const newArticle = buildArticle({
      title: title || 'Untitled Article',
      fileName: fileName || 'bot_upload.txt',
      summary: aiResult.aiSummary,
      steps: aiResult.aiSteps,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : aiResult.aiTags,
      author,
      note: 'Initial Ingestion'
    });

    data.push(newArticle);
    saveData(data);
    res.status(201).json(newArticle);
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/articles', (req, res) => {
  res.json(loadData());
});

app.delete('/api/articles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = loadData().filter(a => a.id !== id);
  saveData(data);
  res.status(204).send();
});

app.put('/api/articles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, steps, note } = req.body;
  const data = loadData();
  const article = data.find(a => a.id === id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  article.title = title !== undefined ? title : article.title;
  article.steps = steps !== undefined ? steps : article.steps;
  article.versionHistory = article.versionHistory || [];
  article.versionHistory.push({
    version: article.versionHistory.length + 1,
    date: new Date(),
    note: note || 'Manual Revision'
  });

  saveData(data);
  res.json(article);
});

app.patch('/api/articles/:id/publish', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = loadData();
  const idx = data.findIndex(a => a.id === id);

  if (idx === -1) {
    return res.status(404).send();
  }

  data[idx].status = 'Published';
  saveData(data);
  res.json(data[idx]);
});

app.patch('/api/articles/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  const data = loadData();
  const article = data.find(a => a.id === id);

  if (!article) {
    return res.status(404).send('Article not found');
  }

  const oldStatus = article.status;
  article.status = status;
  article.versionHistory = article.versionHistory || [];
  article.versionHistory.push({
    version: article.versionHistory.length + 1,
    date: new Date(),
    note: `Status changed from ${oldStatus} to ${status}`
  });

  saveData(data);
  res.json(article);
});

app.listen(3000, () => console.log('DHL Server running at http://localhost:3000'));

