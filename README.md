# DHL RPA Knowledge Based System

A web-based knowledge management portal integrated with UiPath RPA automation. The system automatically ingests SOP documents from Google Drive, processes them with Google Gemini AI to generate summaries and tags, and presents them in a review/publish workflow for DHL staff.

---

## Features

- **RPA Automation** — UiPath reads files from a Google Drive folder and POSTs content to the server automatically
- **AI Processing** — Google Gemini 1.5 Flash generates a summary, category tags, and structured steps for each document
- **Knowledge Portal** — Browser-based UI to search, filter, review, and publish articles
- **Role-Based Access** — Editor and Reviewer roles with different permissions
- **Duplicate Detection** — Skips files already ingested within the last 14 days
- **Version History** — Every status change and edit is tracked per article

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| AI | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Document Parsing | `mammoth` (DOCX), `pdf-parse` (PDF) |
| File Upload | `multer` |
| Frontend | Vanilla HTML/CSS/JS (4 modules) |
| Database | Flat JSON file (`database.json`) |
| RPA | UiPath Studio + GSuite Activities |

---

## Project Structure

```
├── server.js             # Express server — all API routes + AI processing
├── database.json         # Article data store (auto-created)
├── user.json             # User accounts and roles
├── package.json
├── public/
│   ├── index.html        # Main knowledge portal
│   └── login.html        # Login page
├── js/
│   ├── api.js            # All fetch() calls to the server
│   ├── main.js           # App init, auth, event listeners
│   ├── ui.js             # DOM rendering — article cards and modals
│   └── filters.js        # Search and filter logic
├── css/
│   └── styles.css
└── dhlProcess1/          # UiPath RPA project
    └── Main.xaml         # Main workflow
```

---


### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Set your Google API key
# Windows:
set GOOGLE_API_KEY=your_api_key_here

# macOS/Linux:
export GOOGLE_API_KEY=your_api_key_here

# Start the server
node server.js
```

Then open `http://localhost:3000` in your browser.

---

## Default Login Credentials

| Username | Password | Role |
|---|---|---|
| john | admin | Editor |
| mike | admin | Editor |
| sarah | admin | Reviewer |
| alice | admin | Reviewer |

> **Note:** Change these credentials in `user.json` before deploying.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | Authenticate a user |
| GET | `/api/articles` | Fetch all articles |
| POST | `/api/ingest` | Ingest article from UiPath (JSON body) |
| POST | `/api/upload` | Upload a file manually via browser |
| PUT | `/api/articles/:id` | Edit article title and steps |
| PATCH | `/api/articles/:id/status` | Change article status |
| DELETE | `/api/articles/:id` | Delete an article |

### UiPath Ingest Payload

```json
{
  "title": "Article Title",
  "fileName": "document.pdf",
  "rawContent": "Full extracted text content..."
}
```

---

## UiPath RPA Setup

1. Open `dhlProcess1/` in UiPath Studio
2. Connect your Google Drive account under **Data Manager → Connections**
3. Set the target folder to your Google Drive SOP folder
4. Set the download destination path to a local folder that exists on your machine
5. Make sure `server.js` is running on `localhost:3000` before executing
6. Run `Main.xaml` — the bot will iterate all files, extract content, and POST to `/api/ingest`

### Supported File Types

| Extension | Read Activity |
|---|---|
| `.txt` | Read Text File |
| `.pdf` | Read PDF Text |
| `.docx` | Word Application Scope → Word Read Text |
| `.jpg` | Skipped (logged) |

---

## Article Lifecycle

```
Draft → (Reviewer approves) → Reviewed → (Editor publishes) → Published
```

Each transition is recorded in the article's version history.

---


## Notes

- `database.json` and `uploads/` are excluded from version control via `.gitignore`
- If `GOOGLE_API_KEY` is not set, the system falls back to basic keyword-based tagging
- The duplicate check is based on `fileName` — files with the same name ingested within 14 days are skipped
