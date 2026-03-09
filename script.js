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



