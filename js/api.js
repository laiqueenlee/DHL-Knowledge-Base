const API = {
    
    loadArticles: () => {
        return fetch('/api/articles')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load articles');
                return res.json();
            })
            .catch(err => {
                console.error('Error loading articles:', err);
                throw err;
            });
    },


    publishArticle: (id) => {
        return fetch(`/api/articles/${id}/status`, { 
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Published' })
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to publish article');
                return res;
            })
            .catch(err => {
                console.error('Error publishing article:', err);
                throw err;
            });
    },


    reviewArticle: (id) => {
        return fetch(`/api/articles/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Reviewed' })
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to review article');
                return res;
            })
            .catch(err => {
                console.error('Error reviewing article:', err);
                throw err;
            });
    },


    deleteArticle: (id) => {
        return fetch(`/api/articles/${id}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to delete article');
                return res;
            })
            .catch(err => {
                console.error('Error deleting article:', err);
                throw err;
            });
    },


    updateArticle: (id, data) => {
        return fetch(`/api/articles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to update article');
                return res;
            })
            .catch(err => {
                console.error('Error updating article:', err);
                throw err;
            });
    },


    ingest: (payload) => {
        return fetch('/api/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to ingest article');
                return res;
            })
            .catch(err => {
                console.error('Error ingesting article:', err);
                throw err;
            });
    },

    
    upload: (formData) => {
        return fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to upload file');
                return res.json();
            })
            .catch(err => {
                console.error('Error uploading file:', err);
                throw err;
            });
    }
};