// Constants

const API_BASE = 'https://phi-lab-server.vercel.app/api/v1/lab';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin123';
const SEARCH_DEBOUNCE_DELAY = 500;
const ITEMS_PER_PAGE = 12;

// State Management
let isLoggedIn = false;
let allIssues = [];
let filteredIssues = [];
let currentTab = 'all';
let isLoading = false;
let searchTimeout = null;
let isSearching = false;
let currentPage = 1;
let searchCache = {};


// DOM Elements
const loginPage = document.getElementById('loginPage');
const mainPage = document.getElementById('mainPage');
const loginForm = document.getElementById('loginForm');

const issuesGrid = document.getElementById('issuesGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const loadingSkeleton = document.getElementById('loadingSkeleton');
const noResults = document.getElementById('noResults');
const noResultsMessage = document.getElementById('noResultsMessage');
const searchInput = document.getElementById('searchInput');
const searchInputMobile = document.getElementById('searchInputMobile');
const tabButtons = document.querySelectorAll('.tab-btn');
const issueModal = document.getElementById('issueModal');
const helpModal = document.getElementById('helpModal');
const closeModal = document.getElementById('closeModal');
const closeHelpModal = document.getElementById('closeHelpModal');
const issueCount = document.getElementById('issueCount');
const issueBreakdown = document.getElementById('issueBreakdown');
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');
const helpBtn = document.getElementById('helpBtn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreContainer = document.getElementById('loadMoreContainer');


// initialize

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isLoggedIn')) {
        isLoggedIn = true;
        showMainPage();
    }

    loginForm.addEventListener('submit', handleLogin);
    tabButtons.forEach(btn => btn.addEventListener('click', handleTabChange));
    
    searchInput.addEventListener('input', (e) => {
        searchInputMobile.value = e.target.value;
        debouncedSearch(e.target.value);
    });

    searchInputMobile.addEventListener('input', (e) => {
        searchInput.value = e.target.value;
        debouncedSearch(e.target.value);
    });

    closeModal.addEventListener('click', closeIssueModal);
    issueModal.addEventListener('click', (e) => {
        if (e.target === issueModal) closeIssueModal();
    });

    closeHelpModal.addEventListener('click', () => {
        helpModal.classList.add('hidden');
    });

    helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
    });

    logoutBtn.addEventListener('click', handleLogout);
    logoutBtnMobile.addEventListener('click', handleLogout);

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }

   
});



// Login Handler
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        alert('❌ Please enter both username and password');
        return;
    }

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('username', username);
        isLoggedIn = true;
        showMainPage();
    } else {
        alert('❌ Invalid credentials.\n\nDefault:\nUsername: admin\nPassword: admin123');
        document.getElementById('loginForm').reset();
    }
}




// Logout Handler
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.reload();
    }
}

// Show Main Page
function showMainPage() {
    loginPage.classList.add('hidden');
    mainPage.classList.remove('hidden');
    document.body.style.overflow = 'auto';
    loadIssues();
}



// Load Issues from API
async function loadIssues() {
    if (isLoading) return;
    
    isLoading = true;
    showSkeletonLoaders(true);
    noResults.classList.add('hidden');
    issuesGrid.innerHTML = '';
    loadMoreContainer.classList.add('hidden');
    currentPage = 1;

    try {
        const response = await fetch(`${API_BASE}/issues`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        if (result.status !== 'success' || !result.data) {
            throw new Error('Invalid API response');
        }

        allIssues = result.data || [];
        searchCache = {};

        if (allIssues.length === 0) {
            showNoResults('No issues available');
            updateCounts();
            return;
        }

        filteredIssues = filterIssuesByTab(allIssues, currentTab);
        displayIssuesWithPagination();
        updateCounts();
        clearSearchInputs();
    } catch (error) {
        console.error('Error loading issues:', error);
        showNoResults(`⚠️ Error: ${error.message}. Please refresh to try again.`);
        issueCount.textContent = '0';
    } finally {
        isLoading = false;
        showSkeletonLoaders(false);
    }
}






// Display Issues with Pagination
function displayIssuesWithPagination() {
    issuesGrid.innerHTML = '';
    
    if (filteredIssues.length === 0) {
        showNoResults(`No ${currentTab === 'all' ? 'issues' : currentTab + ' issues'} found`);
        updateCounts();
        return;
    }

    noResults.classList.add('hidden');

    const start = 0;
    const end = currentPage * ITEMS_PER_PAGE;
    const issuesToDisplay = filteredIssues.slice(start, end);

    issuesToDisplay.forEach((issue, index) => {
        const card = createIssueCard(issue);
        card.style.animationDelay = `${index * 0.05}s`;
        issuesGrid.appendChild(card);
    });

    // Show load more button if needed
    if (end < filteredIssues.length) {
        loadMoreContainer.classList.remove('hidden');
    } else {
        loadMoreContainer.classList.add('hidden');
    }

    updateCounts();
}

// Load More Issues
function loadMore() {
    currentPage++;
    displayIssuesWithPagination();
}



// Create Issue Card
function createIssueCard(issue) {
    const card = document.createElement('div');
    card.className = `issue-card p-4 bg-white rounded-lg border border-gray-200 ${
        issue.status === 'open' ? 'open' : 'closed'
    }`;
    card.setAttribute('aria-label', `${issue.title} - ${issue.status} issue`);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const priorityClass = getPriorityClass(issue.priority);
    const statusClass = getStatusClass(issue.status);
    const createdDate = formatDate(issue.createdAt);
    // Build labels display - show all with truncation
    const labelsHtml = issue.labels && issue.labels.length > 0
        ? issue.labels
            .map(label => `<span class="text-xs px-2 py-1 rounded badge-label truncate">${escapeHtml(label)}</span>`)
            .join('')
        : '<span class="text-xs text-gray-400">No labels</span>';

    const assigneeDisplay = issue.assignee 
        ? `<p><strong>Assignee:</strong> ${escapeHtml(issue.assignee)}</p>`
        : '';

    card.innerHTML = `
        <div class="mb-3 flex-grow">
            <h3 class="font-semibold text-gray-900 truncate text-sm md:text-base line-clamp-2">${escapeHtml(issue.title)}</h3>
            <p class="text-xs md:text-sm text-gray-600 line-clamp-2 mt-1">${escapeHtml(issue.description)}</p>
        </div>
        <div class="flex gap-2 mb-3 flex-wrap">
            <span class="text-xs px-2 py-1 rounded font-medium ${priorityClass}">${issue.priority.toUpperCase()}</span>
            <span class="text-xs px-2 py-1 rounded font-medium ${statusClass}">${issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}</span>
        </div>
        <div class="text-xs text-gray-600 space-y-1 mb-3 border-t pt-3">
            <p><strong>Author:</strong> ${escapeHtml(issue.author)}</p>
            ${assigneeDisplay}
            <p><strong>Created:</strong> ${createdDate}</p>
        </div>
        <div class="flex gap-1 flex-wrap">
            ${labelsHtml}
        </div>
    `;

    card.addEventListener('click', () => openIssueModal(issue));
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openIssueModal(issue);
        }
    });

    return card;
}




// Open Modal
async function openIssueModal(issue) {
    try {
        document.body.style.overflow = 'hidden';
        showLoading(true);

        const response = await fetch(`${API_BASE}/issue/${issue.id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        if (result.status !== 'success' || !result.data) {
            throw new Error('Invalid response');
        }

        const fullIssue = result.data;
        
        // Status and Meta Info
        const statusEl = document.getElementById('modalStatus');
        statusEl.textContent = fullIssue.status.charAt(0).toUpperCase() + fullIssue.status.slice(1);
        statusEl.className = `text-xs font-semibold px-3 py-1 rounded-full ${
            fullIssue.status === 'open' ? 'is-open' : 'is-closed'
        }`;

        // Meta info: "Opened by Author • Date"
        const metaEl = document.getElementById('modalMeta');
        metaEl.textContent = `${fullIssue.status === 'open' ? 'Opened' : 'Closed'} by ${escapeHtml(fullIssue.author)} • ${formatDate(fullIssue.createdAt)}`;

        // Title
        document.getElementById('modalTitle').textContent = fullIssue.title;

        // Description
        document.getElementById('modalDescription').textContent = fullIssue.description;

        // Assignee
        document.getElementById('modalAssignee').textContent = fullIssue.assignee || 'Not assigned';

        // Priority
        const priorityClass = getPriorityClass(fullIssue.priority);
        document.getElementById('modalPriority').innerHTML = 
            `<span class="text-sm font-semibold px-3 py-1 rounded-full ${priorityClass}">${fullIssue.priority.toUpperCase()}</span>`;

        // Labels
        const labelsDiv = document.getElementById('modalLabels');
        if (fullIssue.labels && fullIssue.labels.length > 0) {
            labelsDiv.innerHTML = fullIssue.labels
                .map(label => `<span class="text-xs font-semibold px-3 py-1 rounded-full badge-label">${escapeHtml(label).toUpperCase()}</span>`)
                .join('');
        } else {
            labelsDiv.innerHTML = '';
        }
        
        issueModal.classList.remove('hidden');
        closeModal.focus();
    } catch (error) {
        console.error('Error:', error);
        alert(`⚠️ Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}





// close modal
function closeIssueModal() {
    issueModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// handle tab Change
function handleTabChange(e) {
    const tab = e.target.dataset.tab;
    if (!tab) return;

    currentTab = tab;
    currentPage = 1;

    tabButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    clearSearchInputs();
    const query = '';
    
    if (query) {
        handleSearch(query);
    } else {
        filteredIssues = filterIssuesByTab(allIssues, tab);
        displayIssuesWithPagination();
    }
}

// filter issues
function filterIssuesByTab(issues, tab) {
    if (!Array.isArray(issues)) return [];
    
    switch (tab) {
        case 'all':
            return issues;
        case 'open':
            return issues.filter(issue => issue.status === 'open');
        case 'closed':
            return issues.filter(issue => issue.status === 'closed');
        default:
            return issues;
    }
}

// debounced search
function debouncedSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleSearch(query);
    }, SEARCH_DEBOUNCE_DELAY);
}

// handle search
async function handleSearch(query) {
    query = query.trim();

    if (!query) {
        filteredIssues = filterIssuesByTab(allIssues, currentTab);
        currentPage = 1;
        displayIssuesWithPagination();
        updateCounts();
        return;
    }

    if (isSearching) return;

    isSearching = true;
    showLoading(true);
    noResults.classList.add('hidden');
    currentPage = 1;

    try {
        // Check cache first
        if (searchCache[query]) {
            const results = searchCache[query];
            const filtered = filterIssuesByTab(results, currentTab);
            filteredIssues = filtered;
            
            if (filtered.length === 0) {
                noResultsMessage.textContent = `No results found for "${escapeHtml(query)}"`;
                showNoResults();
            } else {
                displayIssuesWithPagination();
            }
            return;
        }

        const response = await fetch(`${API_BASE}/issues/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        if (result.status !== 'success') throw new Error('Invalid response');

        const searchResults = result.data || [];
        searchCache[query] = searchResults;

        const filtered = filterIssuesByTab(searchResults, currentTab);
        filteredIssues = filtered;

        if (filtered.length === 0) {
            noResultsMessage.textContent = `No ${currentTab === 'all' ? 'issues' : currentTab + ' issues'} found for "${escapeHtml(query)}"`;
            showNoResults();
        } else {
            displayIssuesWithPagination();
        }
    } catch (error) {
        console.error('Search error:', error);
        noResultsMessage.textContent = `Search error: ${error.message}`;
        showNoResults();
    } finally {
        isSearching = false;
        showLoading(false);
    }
}


// update issue counts
function updateCounts() {
    const total = allIssues.length;
    const openCount = allIssues.filter(i => i.status === 'open').length;
    const closedCount = allIssues.filter(i => i.status === 'closed').length;

    if (currentTab === 'all') {
        issueCount.textContent = filteredIssues.length;
        issueBreakdown.textContent = `${openCount} Open · ${closedCount} Closed`;
    } else if (currentTab === 'open') {
        issueCount.textContent = filteredIssues.length;
        issueBreakdown.textContent = `Open Issues`;
    } else {
        issueCount.textContent = filteredIssues.length;
        issueBreakdown.textContent = `Closed Issues`;
    }
}


// clear search
function clearSearchInputs() {
    searchInput.value = '';
    searchInputMobile.value = '';
}

// show/hide loading
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

// show/hide skeleton
function showSkeletonLoaders(show) {
    if (show) {
        loadingSkeleton.classList.remove('hidden');
    } else {
        loadingSkeleton.classList.add('hidden');
    }
}

// show no results
function showNoResults(message = 'No issues found') {
    noResults.classList.remove('hidden');
    if (message) {
        noResultsMessage.textContent = message;
    }
    issuesGrid.innerHTML = '';
    loadMoreContainer.classList.add('hidden');
}

// helper functions
function getPriorityClass(priority) {
    const upper = (priority || '').toUpperCase();
    switch (upper) {
        case 'HIGH': return 'badge-high';
        case 'MEDIUM': return 'badge-medium';
        case 'LOW': return 'badge-low';
        default: return 'bg-gray-100 text-gray-700';
    }
}

function getStatusClass(status) {
    const lower = (status || '').toLowerCase();
    switch (lower) {
        case 'open': return 'badge-open';
        case 'closed': return 'badge-closed';
        default: return 'bg-gray-100 text-gray-700';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error();
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return 'N/A';
    }
}

function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}




