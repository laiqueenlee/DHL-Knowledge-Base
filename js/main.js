//Main Module - App Initialization & Events

let allArticles = [];
let currentUsername = '';
let currentUserRole = '';

//Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    registerEventListeners();
    loadArticles();
});

function checkAuth() {
    if (localStorage.getItem('dhl_auth') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    currentUsername = localStorage.getItem('dhl_user') || 'Unknown User';
    currentUserRole = localStorage.getItem('dhl_role');
    window.currentUsername = currentUsername;
    window.currentUserRole = currentUserRole;
    applyRoleAccess();
}


function registerEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    const createArticleBtn = document.getElementById('create-article-btn');
    if (createArticleBtn) {
        createArticleBtn.addEventListener('click', toggleManualForm);
    }

    const manualForm = document.getElementById('manual-form');
    if (manualForm) {
        manualForm.addEventListener('submit', handleManualFormSubmit);
    }

    const uploadFileBtn = document.getElementById('upload-file-btn');
    if (uploadFileBtn) {
        uploadFileBtn.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
    }

    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', handleFilterChange);
    }

    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilterChange);
    }

    const tagFilter = document.getElementById('tag-filter');
    if (tagFilter) {
        tagFilter.addEventListener('change', handleFilterChange);
    }

    const closeWorkspaceBtn = document.getElementById('close-workspace-btn');
    if (closeWorkspaceBtn) {
        closeWorkspaceBtn.addEventListener('click', closeWorkspace);
    }

    const saveChangesBtn = document.getElementById('save-changes-btn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', handleSaveChanges);
    }

    const workspace = document.getElementById('editor-workspace');
    if (workspace) {
        workspace.addEventListener('click', (e) => {
            if (e.target === workspace) {
                closeWorkspace();
            }
        });
    }

    document.addEventListener('click', handleArticleCardClick);
}

function applyRoleAccess() {
    const welcomeMessage = document.getElementById('welcome-message');
    const roleBadge = document.getElementById('role-badge');
    const createArticleBtn = document.getElementById('create-article-btn');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const manualForm = document.getElementById('manual-form');

    if (welcomeMessage) {
        welcomeMessage.textContent = `Logged in as: ${currentUsername}`;
    }
    if (roleBadge) {
        roleBadge.textContent = `Role: ${currentUserRole}`;
    }

    if (currentUserRole !== 'Editor') {
        if (createArticleBtn) createArticleBtn.style.display = 'none';
        if (uploadFileBtn) uploadFileBtn.style.display = 'none';
        if (manualForm) manualForm.style.display = 'none';
    } else {
        if (createArticleBtn) createArticleBtn.style.display = 'inline-block';
        if (uploadFileBtn) uploadFileBtn.style.display = 'inline-block';
    }
}

function handleArticleCardClick(e) {
    if (e.target.classList.contains('edit-article-btn')) {
        const id = parseInt(e.target.dataset.articleId);
        const article = allArticles.find(a => a.id === id);
        if (article) {
            openWorkspace(id, article);
        }
    }

    if (e.target.classList.contains('review-article-btn')) {
        const id = parseInt(e.target.dataset.articleId);
        handleReviewArticle(id);
    }

    if (e.target.classList.contains('publish-article-btn')) {
        const id = parseInt(e.target.dataset.articleId);
        handlePublishArticle(id);
    }

    if (e.target.classList.contains('delete-article-btn')) {
        const id = parseInt(e.target.dataset.articleId);
        handleDeleteArticle(id);
    }
}


//Article Management

function loadArticles() {
    const list = document.getElementById('articles-list');
    list.innerHTML = 'Loading articles...';

    API.loadArticles()
        .then(data => {
            allArticles = Array.isArray(data) ? data : [];
            allArticles.sort((a, b) => {
                const aId = Number(a.id) || 0;
                const bId = Number(b.id) || 0;
                return bId - aId;
            });
            handleFilterChange();
        })
        .catch(err => {
            console.error('Error loading articles:', err);
            list.innerHTML = '<p style="color: red;">Error loading articles. Please try again.</p>';
        });
}


function handleReviewArticle(id) {
    if (currentUserRole !== 'Reviewer') {
        alert('Only Reviewers can review articles.');
        return;
    }

    if (!confirm('Mark this article as Reviewed?')) {
        return;
    }

    API.reviewArticle(id)
        .then(() => {
            loadArticles();
        })
        .catch(err => {
            console.error('Error reviewing article:', err);
            alert('Error reviewing article. Please try again.');
        });
}


function handlePublishArticle(id) {
    if (currentUserRole !== 'Editor') {
        alert('Only Editors can publish articles.');
        return;
    }

    if (!confirm('Publish this article to production?')) {
        return;
    }

    API.publishArticle(id)
        .then(() => {
            loadArticles();
        })
        .catch(err => {
            console.error('Error publishing article:', err);
            alert('Error publishing article. Please try again.');
        });
}


function handleDeleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article?')) {
        return;
    }

    API.deleteArticle(id)
        .then(() => {
            loadArticles();
        })
        .catch(err => {
            console.error('Error deleting article:', err);
            alert('Error deleting article. Please try again.');
        });
}


function handleSaveChanges() {
    const id = parseInt(document.getElementById('edit-id').value);
    const title = document.getElementById('edit-title').value.trim();
    const steps = document.getElementById('edit-steps').value.trim();

    if (!title || !steps) {
        alert('Title and content cannot be empty.');
        return;
    }

    const updatedData = {
        title: title,
        steps: steps,
        note: 'Manual Revision'
    };

    API.updateArticle(id, updatedData)
        .then(() => {
            closeWorkspace();
            loadArticles();
        })
        .catch(err => {
            console.error('Error updating article:', err);
            alert('Error saving changes. Please try again.');
        });
}

//Manual Form & File Upload

function handleManualFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('m-title').value.trim();
    const content = document.getElementById('m-content').value.trim();
    const tag = document.getElementById('m-tags').value;

    if (!title || !content || !tag) {
        alert('All fields are required.');
        return;
    }

    const safeFileName = `${title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_') || 'manual_article'}.txt`;
    const payload = {
        title: title,
        rawTextContent: content,
        fileName: safeFileName,
        author: currentUsername || 'Unknown User',
        tags: [tag]
    };

    API.ingest(payload)
        .then(() => {
            toggleManualForm();
            clearManualForm();
            loadArticles();
        })
        .catch(err => {
            console.error('Error ingesting article:', err);
            alert('Error submitting article. Please try again.');
        });
}


function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['.docx', '.pdf', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.some(type => fileName.endsWith(type));

    if (!isValidType) {
        alert('Invalid file type. Please upload .docx, .pdf, or .txt files.');
        return;
    }

    const formData = new FormData();
    formData.append('articleFile', file);
    formData.append('author', currentUsername || 'Unknown User');

    console.log('Uploading:', file.name);

    API.upload(formData)
        .then(data => {
            alert(`Successfully uploaded and processed: ${file.name}`);
            loadArticles();
            e.target.value = '';
        })
        .catch(err => {
            console.error('Error uploading file:', err);
            alert('Failed to upload file. Please try again.');
        });
}

//Filter & Search

function handleFilterChange() {
    const filtered = applyFilters(allArticles);
    renderArticles(filtered);
}

function logout() {
    localStorage.removeItem('dhl_auth');
    localStorage.removeItem('dhl_user');
    localStorage.removeItem('dhl_role');
    window.location.href = '/login.html';
}