// ============================================================
// supabaseClient CONFIG
// ============================================================
const SUPABASE_URL = 'https://lwhsiieupsqypswrusmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHNpaWV1cHNxeXBzd3J1c21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzk0NTksImV4cCI6MjA4NzYxNTQ1OX0.wj93qGU1uFDMSuzTKrNOmd8FTkaLlOBlWqhayalnkRA';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// STATE
// ============================================================
let tasks = [];
let currentUser = null;
let currentFilter = 'all'; // 'all', 'in-progress', 'completed'
let searchQuery = '';

// ============================================================
// DOM — MAIN APP
// ============================================================
const appContainer = document.getElementById('app-container');
const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const priorityInput = document.getElementById('task-priority');
const descInput = document.getElementById('task-desc');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const addTaskWrapper = document.getElementById('add-task-wrapper');
const toggleFormBtn = document.getElementById('toggle-form-btn');
const closeFormBtn = document.getElementById('close-form-btn');
const addModal = document.getElementById('add-modal');
const toastContainer = document.getElementById('toast-container');
const userGreetingEl = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');

// DOM — EDIT MODAL
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTitleInput = document.getElementById('edit-task-title');
const editPriorityInput = document.getElementById('edit-task-priority');
const editDescInput = document.getElementById('edit-task-desc');
const editTaskIdInput = document.getElementById('edit-task-id');
const closeModalBtn = document.getElementById('close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');

// DOM — AUTH MODAL
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const signupUsernameInput = document.getElementById('signup-username');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupError = document.getElementById('signup-error');
const signupSubmitBtn = document.getElementById('signup-submit-btn');
const githubLoginBtn = document.getElementById('github-login');
const googleLoginBtn = document.getElementById('google-login');
const themeToggleApp = document.getElementById('theme-toggle-app');
const themeToggleAuth = document.getElementById('theme-toggle-auth');
const authTabs = document.querySelectorAll('.auth-tab');

// DOM — DASHBOARD
const statCompleted = document.getElementById('stat-completed');
const statProgress = document.getElementById('stat-progress');
const statHigh = document.getElementById('stat-high');
const statLow = document.getElementById('stat-low');

// ============================================================
// AUTH TABS — global function, called directly from onclick
// attributes in HTML so switching always works instantly.
// ============================================================
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    loginForm.style.display = tab === 'login' ? 'flex' : 'none';
    signupForm.style.display = tab === 'signup' ? 'flex' : 'none';
}

// ============================================================
// SVG Icons
// ============================================================
const Icons = {
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`
};

// ============================================================
// INIT
// ============================================================
async function init() {
    // 0. Load theme
    loadTheme();

    // 1. Cleanup malformed hashes from OAuth (e.g., ## to #)
    if (window.location.hash.startsWith('##')) {
        window.history.replaceState(null, null, window.location.pathname + window.location.hash.substring(1));
    }

    setupEventListeners();

    // 2. Check initial session to avoid race condition and missing load
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
        showApp();
        fetchTasks(); // Non-blocking
    } else {
        showAuthModal();
    }

    // 3. Listen to auth state changes and DO NOT block the event loop with awaits
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            const isNewUser = !currentUser || currentUser.id !== session.user.id;
            currentUser = session.user;
            showApp();

            // Prevent token reload bugs by cleaning URL hash after successful sign in
            if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
                window.history.replaceState(null, null, window.location.pathname);
            }

            // Only fetch tasks for a newly authenticated session, not every token refresh
            if (isNewUser || event === 'SIGNED_IN') {
                fetchTasks();
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            tasks = [];
            showAuthModal();
        }
    });
}

// ============================================================
// AUTH UI HELPERS
// ============================================================
function showApp() {
    if (!currentUser) return;
    authModal.style.display = 'none';
    appContainer.style.display = 'flex';

    // Get username from metadata, fallback to email prefix if not found
    const username = currentUser.user_metadata?.username || currentUser.email.split('@')[0];
    userGreetingEl.textContent = `¡Hola, ${username}!`;

    renderTasks();
}

function showAuthModal() {
    authModal.style.display = 'flex';
    appContainer.style.display = 'none';
    taskList.innerHTML = '';
}

// ============================================================
// THEME MANAGEMENT
// ============================================================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('taskflow-theme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('taskflow-theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

// ============================================================
// AUTH ACTIONS
// ============================================================
async function handleLogin(e) {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    loginError.style.display = 'none';
    loginSubmitBtn.classList.add('btn-loading');
    loginSubmitBtn.textContent = 'Iniciando sesión...';

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        }
    } finally {
        loginSubmitBtn.classList.remove('btn-loading');
        loginSubmitBtn.textContent = 'Iniciar sesión';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = signupUsernameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;

    if (!username) {
        signupError.textContent = 'Por favor, introduce un nombre de usuario.';
        signupError.style.background = '';
        signupError.style.color = '';
        signupError.style.display = 'block';
        return;
    }

    signupError.style.display = 'none';
    signupSubmitBtn.classList.add('btn-loading');
    signupSubmitBtn.textContent = 'Creando cuenta...';

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { username } }   // store username in user_metadata
        });

        if (error) {
            signupError.textContent = error.message;
            signupError.className = 'auth-error';
            signupError.style.display = 'block';
        } else {
            signupError.textContent = '✓ ¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.';
            signupError.className = 'auth-error success-msg';
            signupError.style.display = 'block';
            signupUsernameInput.value = '';
            signupEmailInput.value = '';
            signupPasswordInput.value = '';
        }
    } finally {
        signupSubmitBtn.classList.remove('btn-loading');
        signupSubmitBtn.textContent = 'Crear cuenta';
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        // Clear auth fragments from URL
        window.history.replaceState(null, null, window.location.pathname);
    } catch (err) {
        console.error("Logout error:", err);
    } finally {
        currentUser = null;
        tasks = [];
        showAuthModal();
    }
}

async function handleSocialLogin(provider) {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        showToast(`Error al iniciar con ${provider}: ${error.message}`, 'error');
    }
}

// ============================================================
// DATABASE — TASKS
// ============================================================
async function fetchTasks() {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        showToast('Error al cargar las tareas: ' + error.message, 'error');
        return;
    }
    tasks = data || [];
    renderTasks();
}

async function addTask(title, priority, description) {
    if (!title) return;
    if (!currentUser) {
        showToast('Debes iniciar sesión para añadir tareas', 'error');
        showAuthModal();
        return;
    }

    const newTask = {
        title,
        priority,
        description,
        status: 'in-progress',
        user_id: currentUser.id
    };

    const submitBtn = taskForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.classList.add('btn-loading');

    try {
        const { data, error } = await supabaseClient.from('tasks').insert([newTask]).select().single();

        if (error) {
            showToast('Error al añadir la tarea: ' + error.message, 'error');
            return;
        }

        tasks.unshift(data);

        // Reset form and hide modal
        titleInput.value = '';
        priorityInput.value = 'baja';
        descInput.value = '';
        addModal.classList.add('hidden');

        showToast('Tarea añadida con éxito', 'success');
        renderTasks();
    } finally {
        if (submitBtn) submitBtn.classList.remove('btn-loading');
    }
}

async function toggleTaskStatus(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const currentStatus = tasks[taskIndex].status;
    const newStatus = currentStatus === 'completed' ? 'in-progress' : 'completed';

    // Optimistic UI Update
    tasks[taskIndex].status = newStatus;
    renderTasks();

    const { error } = await supabaseClient
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', currentUser.id);

    if (error) {
        // Revert on error
        tasks[taskIndex].status = currentStatus;
        renderTasks();
        showToast('Error al actualizar la tarea: ' + error.message, 'error');
        return;
    }

    const statusMsg = newStatus === 'completed' ? 'marcada como completada' : 'marcada como en progreso';
    showToast(`Tarea ${statusMsg}`, 'info');
}

async function deleteTask(id) {
    const originalTasks = [...tasks];

    // Optimistic UI Update
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();

    const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

    if (error) {
        // Revert
        tasks = originalTasks;
        renderTasks();
        showToast('Error al eliminar la tarea: ' + error.message, 'error');
        return;
    }

    showToast('Tarea eliminada', 'info');
}

// ============================================================
// EDIT MODAL
// ============================================================
function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editTaskIdInput.value = task.id;
    editTitleInput.value = task.title;
    editPriorityInput.value = task.priority || 'baja';
    editDescInput.value = task.description || '';

    editModal.classList.remove('hidden');
    editTitleInput.focus();
}

function closeEditModal() {
    editModal.classList.add('hidden');
    setTimeout(() => { editForm.reset(); }, 300);
}

async function saveEditedTask() {
    const id = editTaskIdInput.value;
    const newTitle = editTitleInput.value.trim();
    const newPriority = editPriorityInput.value;
    const newDesc = editDescInput.value.trim();

    if (!newTitle) return;

    const submitBtn = editForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.classList.add('btn-loading');

    try {
        const { error } = await supabaseClient
            .from('tasks')
            .update({ title: newTitle, priority: newPriority, description: newDesc })
            .eq('id', id)
            .eq('user_id', currentUser.id);

        if (error) {
            showToast('Error al guardar la tarea: ' + error.message, 'error');
            return;
        }

        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
            tasks[taskIndex].title = newTitle;
            tasks[taskIndex].priority = newPriority;
            tasks[taskIndex].description = newDesc;
        }

        renderTasks();
        closeEditModal();
        showToast('Tarea actualizada con éxito', 'success');
    } finally {
        if (submitBtn) submitBtn.classList.remove('btn-loading');
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    // AUTH — form submit handlers and logout
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);

    githubLoginBtn.addEventListener('click', () => handleSocialLogin('github'));
    googleLoginBtn.addEventListener('click', () => handleSocialLogin('google'));

    // THEME TOGGLE
    if (themeToggleApp) themeToggleApp.addEventListener('click', toggleTheme);
    if (themeToggleAuth) themeToggleAuth.addEventListener('click', toggleTheme);

    // Note: tabs are wired up in a separate DOMContentLoaded above

    // FORM TOGGLE / ADD MODAL
    toggleFormBtn.addEventListener('click', () => {
        addModal.classList.remove('hidden');
        titleInput.focus();
    });

    closeFormBtn.addEventListener('click', () => {
        addModal.classList.add('hidden');
    });

    // Close ADD MODAL safely on click outside
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.classList.add('hidden');
        }
    });

    // ADD TASK
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTask(titleInput.value.trim(), priorityInput.value, descInput.value.trim());
    });

    // SEARCH
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTasks();
    });

    // FILTER
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // EDIT MODAL
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!editModal.classList.contains('hidden')) closeEditModal();
            if (!addModal.classList.contains('hidden')) addModal.classList.add('hidden');
        }
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditedTask();
    });
}

// ============================================================
// RENDER
// ============================================================
function renderTasks() {
    updateDashboardStats();

    let filteredTasks = tasks.filter(task => {
        if (currentFilter === 'in-progress' && task.status !== 'in-progress') return false;
        if (currentFilter === 'completed' && task.status !== 'completed') return false;

        if (searchQuery) {
            const matchTitle = task.title.toLowerCase().includes(searchQuery);
            const matchDesc = task.description && task.description.toLowerCase().includes(searchQuery);
            if (!matchTitle && !matchDesc) return false;
        }

        return true;
    });

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '';
        emptyState.classList.remove('hidden');

        const p = emptyState.querySelector('p');
        if (searchQuery) {
            p.textContent = 'Ninguna tarea coincide con tu búsqueda.';
        } else if (currentFilter !== 'all') {
            p.textContent = `No se encontraron tareas ${currentFilter === 'completed' ? 'completadas' : 'en progreso'}.`;
        } else {
            p.textContent = 'No se encontraron tareas. ¡Añade una nueva tarea para empezar!';
        }
        return;
    }

    emptyState.classList.add('hidden');
    taskList.innerHTML = '';

    filteredTasks.forEach(task => {
        const isCompleted = task.status === 'completed';
        const li = document.createElement('li');
        li.className = `task-item ${isCompleted ? 'completed' : ''}`;
        li.dataset.id = task.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = isCompleted;
        checkbox.title = isCompleted ? 'Marcar como en progreso' : 'Marcar como completada';
        checkbox.addEventListener('change', () => toggleTaskStatus(task.id));

        const content = document.createElement('div');
        content.className = 'task-content';

        const header = document.createElement('div');
        header.className = 'task-header';

        const titleArea = document.createElement('div');
        titleArea.style.flex = '1';

        const titleHeaderLine = document.createElement('div');
        titleHeaderLine.style.display = 'flex';
        titleHeaderLine.style.justifyContent = 'space-between';
        titleHeaderLine.style.alignItems = 'flex-start';

        const title = document.createElement('h3');
        title.className = 'task-title';
        title.textContent = task.title;
        titleHeaderLine.appendChild(title);

        if (task.priority) {
            const priorityBadge = document.createElement('span');
            priorityBadge.className = `priority-badge priority-${task.priority}`;
            priorityBadge.textContent = task.priority === 'alta' ? 'Alta prioridad' : 'Baja prioridad';
            titleHeaderLine.appendChild(priorityBadge);
        }

        titleArea.appendChild(titleHeaderLine);

        if (task.description) {
            const desc = document.createElement('p');
            desc.className = 'task-desc';
            desc.textContent = task.description;
            titleArea.appendChild(desc);
        }

        const badge = document.createElement('span');
        badge.className = `task-status-badge status-${task.status}`;
        badge.textContent = isCompleted ? 'Completada' : 'En progreso';
        titleArea.appendChild(badge);

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn edit';
        editBtn.innerHTML = Icons.edit;
        editBtn.title = 'Editar tarea';
        editBtn.addEventListener('click', () => openEditModal(task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete';
        deleteBtn.innerHTML = Icons.delete;
        deleteBtn.title = 'Eliminar tarea';
        deleteBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
                deleteTask(task.id);
            }
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        header.appendChild(titleArea);
        header.appendChild(actions);
        content.appendChild(header);

        li.appendChild(checkbox);
        li.appendChild(content);

        taskList.appendChild(li);
    });
}

function updateDashboardStats() {
    if (!statCompleted || !statProgress || !statHigh || !statLow) return;

    let completedCount = 0;
    let progressCount = 0;
    let highCount = 0;
    let lowCount = 0;

    tasks.forEach(task => {
        if (task.status === 'completed') completedCount++;
        else progressCount++;

        if (task.priority === 'alta') highCount++;
        else if (task.priority === 'baja') lowCount++;
    });

    statCompleted.textContent = completedCount;
    statProgress.textContent = progressCount;
    statHigh.textContent = highCount;
    statLow.textContent = lowCount;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '';
    if (type === 'success') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error' || type === 'danger') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);
