// Constants

const API_BASE = 'https://phi-lab-server.vercel.app/api/v1/lab';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin123';

// State Management
let isLoggedIn = false;


// DOM Elements
const loginPage = document.getElementById('loginPage');
const mainPage = document.getElementById('mainPage');
const loginForm = document.getElementById('loginForm');


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