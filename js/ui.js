function renderArticles(articles) {
    const list = document.getElementById('articles-list');
    list.innerHTML = '';

    if (articles.length === 0) {
        list.innerHTML = '<p>No articles found matching filters.</p>';
        return;
    }

    articles.forEach(article => {
        const cardElement = createArticleCard(article);
        list.appendChild(cardElement);
    });
}

function createArticleCard(article) {
    const div = document.createElement('div');
    div.className = 'card';
    div.dataset.articleId = article.id;

    const isDraft = article.status === 'Draft';
    const isReviewed = article.status === 'Reviewed';
    const isPublished = article.status === 'Published';
    const statusClass = isDraft ? 'draft' : isReviewed ? 'reviewed' : 'published';
    const userRole = window.currentUserRole || 'Editor';
    const canEdit = userRole === 'Editor';
    const isReviewer = userRole === 'Reviewer';
    const isEditor = userRole === 'Editor';

    const historyHTML = formatVersionHistory(article.versionHistory);

    const tagsHTML = formatTags(article.tags);

    div.innerHTML = `
        <div class="card-header">
            <div>
                <h3 class="card-title">${escapeHtml(article.title)}</h3>
                <div class="tags-container">${tagsHTML}</div>
            </div>
            <span class="status ${statusClass}">${article.status}</span>
        </div>

        <div class="ai-summary">
            🤖 AI Summary: ${escapeHtml(article.summary || 'Pending Analysis...')}
        </div>
        
        <div class="content-section">
            <strong>Content/Steps:</strong>
            <div class="content-steps">${escapeHtml(article.steps || 'No steps provided.')}</div>
        </div>

        <div class="metadata">
            <span><strong>Original File:</strong> ${escapeHtml(article.fileName || 'N/A')}</span>
            <span><strong>Last Author:</strong> ${escapeHtml(article.author || 'RPA_System')}</span>
            <span><strong>Created:</strong> ${escapeHtml(formatCreatedAt(article.createdAt || article.date))}</span>
            <span><strong>Database ID:</strong> #${article.id}</span>
        </div>

        <div class="version-history">
            <strong>Version History:</strong>
            <ul>${historyHTML}</ul>
        </div>

        <div class="card-actions">
            ${canEdit ? `<button class="btn btn-primary edit-article-btn" data-article-id="${article.id}">Edit/Version</button>` : ''}
            ${isDraft && isReviewer ? `<button class="btn btn-info review-article-btn" data-article-id="${article.id}">Review</button>` : ''}
            ${isReviewed && isEditor ? `<button class="btn btn-success publish-article-btn" data-article-id="${article.id}">Publish</button>` : ''}
            ${isPublished ? `<span class="status-published-badge">✅ Published</span>` : ''}
            ${canEdit ? `<button class="btn btn-danger delete-article-btn" data-article-id="${article.id}">Delete</button>` : ''}
        </div>
    `;

    return div;
}

function formatVersionHistory(versionHistory) {
    if (!versionHistory || versionHistory.length === 0) {
        return '<li>Original Version</li>';
    }

    return versionHistory
        .map(v => {
            const date = new Date(v.date).toLocaleDateString();
            return `<li>v${v.version}: ${escapeHtml(v.note)} (${date})</li>`;
        })
        .join('');
}

function formatTags(tags) {
    if (!tags || tags.length === 0) {
        return '';
    }

    return tags
        .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join('');
}

function openWorkspace(id, article) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = article.title;
    document.getElementById('edit-steps').value = article.steps;
    document.getElementById('editor-workspace').style.display = 'block';
}

function closeWorkspace() {
    document.getElementById('editor-workspace').style.display = 'none';
    clearWorkspaceForm();
}

function clearWorkspaceForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-steps').value = '';
}

function toggleManualForm() {
    const form = document.getElementById('manual-form');
    const isVisible = form.style.display !== 'none';
    form.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        clearManualForm();
    }
}

function clearManualForm() {
    document.getElementById('m-title').value = '';
    document.getElementById('m-content').value = '';
    document.getElementById('m-tags').value = '';
}

function formatCreatedAt(value) {
    if (!value) return 'Unknown';

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return escapeHtml(new Date(value).toLocaleDateString());
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(String(value));
    return date.toLocaleString();
}

function escapeHtml(text) {
    if (!text) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
}