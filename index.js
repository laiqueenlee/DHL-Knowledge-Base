<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>DHL Knowledge Base</title>
    <style>
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-draft { background: #eee; color: #666; }
        .status-reviewed { background: #fff3cd; color: #856404; }
        .status-published { background: #d4edda; color: #155724; }

        .history-list {
            font-size: 0.85rem;
            color: #555;
            margin-top: 10px;
            border-top: 1px dashed #ccc;
            padding-top: 5px;
        }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f4f4f4; color: #333; }
        h1 { color: #d40511; border-bottom: 3px solid #ffcc00; padding-bottom: 10px; }
        
        #search-container { margin-bottom: 20px; }
        #search-input { padding: 10px; width: 300px; border: 1px solid #ccc; border-radius: 4px; }

        .card { 
            background: white; 
            padding: 20px; 
            margin-bottom: 15px; 
            border-left: 6px solid #ffcc00; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            border-radius: 4px;
        }
        .status { font-weight: bold; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; text-transform: uppercase; }
        .status-draft { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
        .status-published { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        
        .metadata { font-size: 0.85em; color: #666; background: #fdfdfd; padding: 10px; border-radius: 4px; margin-top: 10px; border-top: 1px solid #eee; }
        .metadata strong { color: #333; }

        button { 
            background: #d40511; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            cursor: pointer; 
            border-radius: 4px; 
            font-weight: bold; 
            transition: background 0.3s;
            margin-top: 5px;
        }
        button:hover { background: #990000; }
        small { color: #888; font-style: italic; }

        #editor-workspace {
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            z-index: 1000;
        }
        .workspace-content {
            background: white;
            margin: 2% auto;
            padding: 30px;
            width: 80%;
            max-width: 900px;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        #m-title, #m-content { width: 100%; margin-bottom: 10px; padding: 8px; box-sizing: border-box; }
    </style>
</head>
<body>

    <button onclick="logout()" style="float: right; background: #666;">Logout</button>

    <h1>DHL Logistics: Knowledge Base Articles</h1>

    <div id="editor-workspace">
        <div class="workspace-content">
            <h2>Article Workspace</h2>
            <label>Article Title</label>
            <input type="hidden" id="edit-id">
            <input type="text" id="edit-title" style="width:100%; margin-bottom:10px; padding: 8px;">
            <label>Content/Steps</label>
            <textarea id="edit-steps" style="width:100%; height:350px; padding: 8px; font-family: sans-serif;"></textarea>
            <br><br>
            <button onclick="saveChanges()" style="background:#28a745;">Save Version</button>
            <button onclick="closeWorkspace()" style="background:#666;">Close</button>
        </div>
    </div>

    <div style="margin-bottom: 20px;">
        <div style="margin-bottom: 20px; display: flex; gap: 10px;">
            <button onclick="toggleForm()" style="background: #28a745;">+ Create Manual Article</button>
            
            <button onclick="document.getElementById('file-input').click()" style="background: #007bff;">+ Upload File (.docx, .pdf, .txt)</button>
            <input type="file" id="file-input" style="display:none" accept=".docx,.pdf,.txt" onchange="handleFileUpload(this)">
        </div>
    </div>

    <div id="manual-form" style="display:none; background: white; padding: 20px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px;">
        <h3>Manual Entry</h3>
        <input type="text" id="m-title" placeholder="Enter Article Title...">
        
        <select id="m-tags" style="width: 100%; margin-bottom: 10px; padding: 8px;">
            <option value="Logistics">Logistics</option>
            <option value="IT Support">IT Support</option>
            <option value="RPA">RPA</option>
            <option value="Warehouse">Warehouse</option>
        </select>

        <textarea id="m-content" placeholder="Type or paste content here..." style="height: 150px;"></textarea>
        <button onclick="submitManual()">Submit Article</button>
    </div>

    <div id="filter-container" style="background: #eee; padding: 15px; margin-bottom: 20px; border-radius: 5px; display: flex; gap: 10px; align-items: center;">
        <strong>Filters:</strong>
        <input type="text" id="search-input" placeholder="Search title..." onkeyup="applyFilters()">
        
        <select id="status-filter" onchange="applyFilters()" style="padding: 8px;">
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
        </select>

        <select id="tag-filter" onchange="applyFilters()" style="padding: 8px;">
            <option value="all">All Tags</option>
            <option value="Logistics">Logistics</option>
            <option value="IT Support">IT Support</option>
            <option value="RPA">RPA</option>
            <option value="Warehouse">Warehouse</option>
        </select>
    </div>

    <div id="articles-list">Loading articles...</div>

    <script>
        if (localStorage.getItem('dhl_auth') !== 'true') {
            window.location.href = 'login.html';
        }

        function logout() {
            localStorage.removeItem('dhl_auth');
            window.location.href = 'login.html';
        }

        let allArticles = [];

        function loadArticles() {
            fetch('/api/articles')
                .then(res => res.json())
                .then(data => {
                    allArticles = data;
                    renderArticles(allArticles);
                })
                .catch(err => {
                    document.getElementById('articles-list').innerText = "Error loading data.";
                });
                
        }

        function renderArticles(articles) {
            const list = document.getElementById('articles-list');
            list.innerHTML = ''; 

            if (articles.length === 0) {
                list.innerHTML = '<p>No articles found matching filters.</p>';
                return;
            }

            articles.forEach(article => {
                const div = document.createElement('div');
                div.className = 'card';
                
                const isDraft = article.status === 'Draft';
                const statusClass = isDraft ? 'status-draft' : 'status-published';
                
                const historyHTML = (article.versionHistory || []).map(v => 
                    `<li>v${v.version}: ${v.note} (${new Date(v.date).toLocaleDateString()})</li>`
                ).join('');

                const tagsHTML = (article.tags || []).map(tag => 
                    `<span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7em; margin-right: 5px;">${tag}</span>`
                ).join('');

                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="margin-top: 0;">${article.title}</h3>
                            <div style="margin-bottom: 10px;">${tagsHTML}</div>
                        </div>
                        <span class="status ${statusClass}">${article.status}</span>
                    </div>
    
                    <p style="color: #d40511; font-weight: bold; font-size: 0.9em; background: #fff0f0; padding: 8px; border-radius: 4px;">
                        🤖 AI Summary: ${article.summary || "Pending Analysis..."}
                    </p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin: 10px 0;">
                        <strong>Content/Steps:</strong>
                        <pre style="white-space: pre-wrap; font-family: inherit; margin-top: 10px;">${article.steps || "No steps provided."}</pre>
                    </div>

                    <div class="metadata">
                        <span><strong>Original File:</strong> ${article.fileName || 'N/A'}</span> | 
                        <span><strong>Last Author:</strong> ${article.author || 'RPA_System'}</span> | 
                        <span><strong>Database ID:</strong> #${article.id}</span>
                    </div>

                    <div style="font-size: 0.8em; color: #555; margin-top: 10px;">
                        <strong>Version History:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px;">${historyHTML || '<li>Original Version</li>'}</ul>
                    </div>

                    <div style="margin-top: 15px;">
                        <button onclick="openWorkspace(${article.id})" style="background: #007bff;">Edit/Version</button>
                        ${isDraft ? `<button onclick="publishArticle(${article.id})" style="margin-left: 10px; background: #28a745;">Approve & Publish</button>` : ' <span style="margin-left: 10px; color: green; font-weight: bold;">✅ Published</span>'}
                        <button onclick="deleteArticle(${article.id})" style="background: #666; margin-left: 10px;">Delete</button>
                    </div>
                `;
                list.appendChild(div);
            });
        }


        function publishArticle(id) {
            if (!confirm("Approve this article for global publishing?")) return;
            fetch(`/api/articles/${id}/publish`, { method: 'PATCH' })
                .then(res => res.ok ? loadArticles() : alert('Error publishing.'))
                .catch(err => console.error(err));
        }

        function applyFilters() {
            const query = document.getElementById('search-input').value.toLowerCase();
            const status = document.getElementById('status-filter').value;
            const tag = document.getElementById('tag-filter').value;

            const filtered = allArticles.filter(a => {
                const matchesSearch = a.title.toLowerCase().includes(query);
                const matchesStatus = (status === 'all' || a.status === status);
                const matchesTag = (tag === 'all' || (a.tags && a.tags.includes(tag)));
                return matchesSearch && matchesStatus && matchesTag;
            });
            renderArticles(filtered);
        }

        function deleteArticle(id) {
            if (!confirm("Are you sure?")) return;
            fetch(`/api/articles/${id}`, { method: 'DELETE' })
                .then(res => res.status === 204 ? loadArticles() : alert('Error deleting.'));
        }

        function toggleForm() {
            const form = document.getElementById('manual-form');
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }

        function submitManual() {
            const title = document.getElementById('m-title').value;
            const rawTextContent = document.getElementById('m-content').value;
            const tag = document.getElementById('m-tags').value;

            if (!title || !rawTextContent) {
                alert("Fields cannot be empty.");
                return;
            }

            fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: title, 
                    rawTextContent, 
                    fileName: 'Manual_UI_Entry.txt',
                    author: 'Web_Admin',
                    tags: [tag]
                })
            })
            .then(res => {
                if (res.ok) {
                    toggleForm();
                    loadArticles();
                }
            });
        }

        function openWorkspace(id) {
            const article = allArticles.find(a => a.id === id);
            document.getElementById('edit-id').value = article.id;
            document.getElementById('edit-title').value = article.title;
            document.getElementById('edit-steps').value = article.steps;
            document.getElementById('editor-workspace').style.display = 'block';
        }

        function saveChanges() {
            const id = document.getElementById('edit-id').value;
            const updatedData = {
                title: document.getElementById('edit-title').value,
                steps: document.getElementById('edit-steps').value,
                note: "Manual Revision" 
            };

            fetch(`/api/articles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            })
            .then(() => {
                closeWorkspace();
                loadArticles();
            });
        }

        function closeWorkspace() {
            document.getElementById('editor-workspace').style.display = 'none';
        }

        loadArticles();
        
        function handleFileUpload(input) {
            const file = input.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("articleFile", file);

            console.log("Uploading:", file.name);

            fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                alert(`Successfully uploaded and processed: ${file.name}`);
                loadArticles();
                input.value = ''; 
            })
            .catch(err => {
                console.error("Upload error:", err);
                alert("Failed to upload file.");
            });
        }
    </script>
</body>
</html>
