function applyFilters(articles) {
    const query = getSearchQuery();
    const status = getStatusFilter();
    const tag = getTagFilter();

    return articles.filter(article => {
        const matchesSearch = matchesSearchQuery(article, query);
        const matchesStatus = matchesStatusFilter(article, status);
        const matchesTag = matchesTagFilter(article, tag);

        return matchesSearch && matchesStatus && matchesTag;
    });
}


function getSearchQuery() {
    const input = document.getElementById('search-input');
    return input ? input.value.toLowerCase() : '';
}


function getStatusFilter() {
    const select = document.getElementById('status-filter');
    return select ? select.value : 'all';
}


function getTagFilter() {
    const select = document.getElementById('tag-filter');
    return select ? select.value : 'all';
}


function matchesSearchQuery(article, query) {
    if (!query) return true;
    const title = article.title ? article.title.toLowerCase() : '';
    return title.includes(query);
}


function matchesStatusFilter(article, status) {
    if (status === 'all') return true;
    return article.status === status;
}


function matchesTagFilter(article, tag) {
    if (tag === 'all') return true;
    return article.tags && Array.isArray(article.tags) && article.tags.includes(tag);
}