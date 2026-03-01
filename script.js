// State tracking
let tasks = [];
let currentFilter = 'all'; // 'all', 'in-progress', 'completed'
let searchQuery = '';

// DOM Elements
const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const priorityInput = document.getElementById('task-priority');
const descInput = document.getElementById('task-desc');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');

// Form Toggle Elements
const addTaskWrapper = document.getElementById('add-task-wrapper');
const toggleFormBtn = document.getElementById('toggle-form-btn');
const closeFormBtn = document.getElementById('close-form-btn');
const taskFormSection = document.getElementById('task-form-section');

// Modal Elements
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTitleInput = document.getElementById('edit-task-title');
const editPriorityInput = document.getElementById('edit-task-priority');
const editDescInput = document.getElementById('edit-task-desc');
const editTaskIdInput = document.getElementById('edit-task-id');
const closeModalBtn = document.getElementById('close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const toastContainer = document.getElementById('toast-container');

// SVG Icons
const Icons = {
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`
};

// Initialize App
function init() {
    // Load from local storage (optional but good practice)
    const storedTasks = localStorage.getItem('taskflow_tasks');
    if (storedTasks) {
        try {
            tasks = JSON.parse(storedTasks);
        } catch (e) {
            console.error('Error parsing stored tasks', e);
            tasks = [];
        }
    }

    renderTasks();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    // Toggle Form
    toggleFormBtn.addEventListener('click', () => {
        taskFormSection.classList.remove('hidden');
        addTaskWrapper.classList.add('hidden');
        titleInput.focus();
    });

    closeFormBtn.addEventListener('click', () => {
        taskFormSection.classList.add('hidden');
        addTaskWrapper.classList.remove('hidden');
    });

    // Add task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTask(titleInput.value.trim(), priorityInput.value, descInput.value.trim());
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTasks();
    });

    // Filter
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update filter and render
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Modal Events
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    // Close modal on outside click
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
            closeEditModal();
        }
    });

    // Edit Form Submit
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditedTask();
    });
}

// Task Actions
function addTask(title, priority, description) {
    if (!title) return;

    const newTask = {
        id: Date.now().toString(),
        title,
        priority,
        description,
        status: 'in-progress',
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveState();

    // Reset form and hide it
    titleInput.value = '';
    priorityInput.value = 'baja';
    descInput.value = '';
    taskFormSection.classList.add('hidden');
    addTaskWrapper.classList.remove('hidden');

    showToast('Task added successfully', 'success');
    renderTasks();
}

function toggleTaskStatus(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        const currentStatus = tasks[taskIndex].status;
        tasks[taskIndex].status = currentStatus === 'completed' ? 'in-progress' : 'completed';
        saveState();
        renderTasks();

        const statusMsg = tasks[taskIndex].status === 'completed' ? 'marked as completed' : 'marked as in progress';
        showToast(`Task ${statusMsg}`, 'info');
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
    showToast('Task deleted', 'info');
}

// Edit Task Logic
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
    setTimeout(() => {
        editForm.reset();
    }, 300); // Wait for transition
}

function saveEditedTask() {
    const id = editTaskIdInput.value;
    const newTitle = editTitleInput.value.trim();
    const newPriority = editPriorityInput.value;
    const newDesc = editDescInput.value.trim();

    if (!newTitle) return;

    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        tasks[taskIndex].title = newTitle;
        tasks[taskIndex].priority = newPriority;
        tasks[taskIndex].description = newDesc;
        saveState();
        renderTasks();
        closeEditModal();
        showToast('Task updated successfully', 'success');
    }
}

// Persist State
function saveState() {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

// Render Logic
function renderTasks() {
    // Apply filters and search
    let filteredTasks = tasks.filter(task => {
        // Apply status filter
        if (currentFilter === 'in-progress' && task.status !== 'in-progress') return false;
        if (currentFilter === 'completed' && task.status !== 'completed') return false;

        // Apply search
        if (searchQuery) {
            const matchTitle = task.title.toLowerCase().includes(searchQuery);
            const matchDesc = task.description && task.description.toLowerCase().includes(searchQuery);
            if (!matchTitle && !matchDesc) return false;
        }

        return true;
    });

    // Toggle empty state
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '';
        emptyState.classList.remove('hidden');

        // Update empty state text based on context
        const p = emptyState.querySelector('p');
        if (searchQuery) {
            p.textContent = 'No tasks match your search.';
        } else if (currentFilter !== 'all') {
            p.textContent = `No ${currentFilter.replace('-', ' ')} tasks found.`;
        } else {
            p.textContent = 'No tasks found. Add a new task to get started!';
        }
        return;
    }

    emptyState.classList.add('hidden');

    // Build HTML
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
        checkbox.title = isCompleted ? 'Mark as in progress' : 'Mark as completed';
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

        // Add priority badge
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
        badge.textContent = isCompleted ? 'Completed' : 'In Progress';
        titleArea.appendChild(badge);

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn edit';
        editBtn.innerHTML = Icons.edit;
        editBtn.title = 'Edit task';
        editBtn.addEventListener('click', () => openEditModal(task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete';
        deleteBtn.innerHTML = Icons.delete;
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this task?')) {
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

// Toast Notifications Function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
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

    // Auto remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3000);
}

// Start app
document.addEventListener('DOMContentLoaded', init);
