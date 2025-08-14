let selectedCategories = [];
let entries = [];
let currentMode = 'quick';
let editingEntry = null;
let deferredPrompt;

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-prompt').style.display = 'block';
});

document.getElementById('install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            document.getElementById('install-prompt').style.display = 'none';
        }
        deferredPrompt = null;
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}

// Load data from localStorage
function loadData() {
    const savedEntries = localStorage.getItem('gratitude-entries');
    const savedStreak = localStorage.getItem('gratitude-streak');
    
    if (savedEntries) {
        entries = JSON.parse(savedEntries);
    }
    
    if (savedStreak) {
        document.getElementById('streak-count').textContent = savedStreak;
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('gratitude-entries', JSON.stringify(entries));
    localStorage.setItem('gratitude-streak', document.getElementById('streak-count').textContent);
}

// Mode switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        switchMode(mode);
    });
});

function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const quickMode = document.getElementById('quick-mode');
    if (mode === 'journal') {
        quickMode.style.display = 'none';
        document.querySelector('.section-title').textContent = 'Was beschäftigt dich heute? Lass deinen Gedanken freien Lauf...';
        document.getElementById('journal-text').placeholder = 'Schreibe über alles, wofür du dankbar bist. Nimm dir Zeit zum Reflektieren...';
    } else {
        quickMode.style.display = 'block';
        document.querySelector('.section-title').textContent = 'Zusätzliche Gedanken (optional)';
        document.getElementById('journal-text').placeholder = 'Beschreibe, was dich heute besonders dankbar gemacht hat...';
    }
}

// Category selection
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        
        if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            const counterEl = btn.querySelector('.selection-counter');
            if (counterEl) counterEl.remove();
            selectedCategories = selectedCategories.filter(c => c !== category);
        } else if (selectedCategories.length < 10) {
            btn.classList.add('selected');
            selectedCategories.push(category);
            updateSelectionCounter(btn);
        }
        
        updateUI();
    });
});

function updateSelectionCounter(btn) {
    const existing = btn.querySelector('.selection-counter');
    if (existing) existing.remove();
    
    const counter = document.createElement('div');
    counter.className = 'selection-counter';
    counter.textContent = selectedCategories.length;
    btn.appendChild(counter);
}

function updateUI() {
    document.getElementById('selection-count').textContent = selectedCategories.length;
    
    const saveBtn = document.getElementById('save-btn');
    const hasContent = selectedCategories.length > 0 || document.getElementById('journal-text').value.trim();
    saveBtn.disabled = !hasContent;
    
    if (editingEntry) {
        saveBtn.textContent = 'Änderungen speichern ✏️';
    } else {
        saveBtn.textContent = 'Eintrag speichern 💫';
    }
}

// Journal text change
document.getElementById('journal-text').addEventListener('input', updateUI);

// Clear form
document.getElementById('clear-btn').addEventListener('click', resetForm);

// Save entry
document.getElementById('save-btn').addEventListener('click', () => {
    const journalText = document.getElementById('journal-text').value.trim();
    
    if (selectedCategories.length === 0 && !journalText) {
        return;
    }

    const entry = {
        id: editingEntry ? editingEntry.id : Date.now(),
        date: editingEntry ? editingEntry.date : new Date().toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        categories: [...selectedCategories],
        text: journalText,
        timestamp: editingEntry ? editingEntry.timestamp : Date.now()
    };

    if (editingEntry) {
        const index = entries.findIndex(e => e.id === editingEntry.id);
        entries[index] = entry;
        editingEntry = null;
    } else {
        entries.unshift(entry);
        
        // Update streak
        const currentStreak = parseInt(document.getElementById('streak-count').textContent);
        document.getElementById('streak-count').textContent = currentStreak + 1;
    }

    saveData();
    renderEntries();
    resetForm();
    
    // Show success feedback
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Gespeichert! ✨';
    saveBtn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
    
    setTimeout(() => {
        saveBtn.textContent = 'Eintrag speichern 💫';
        saveBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    }, 2000);
});

function resetForm() {
    selectedCategories = [];
    editingEntry = null;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('selected');
        const counter = btn.querySelector('.selection-counter');
        if (counter) counter.remove();
    });
    document.getElementById('journal-text').value = '';
    updateUI();
}

function editEntry(entry) {
    editingEntry = entry;
    selectedCategories = [...entry.categories];
    document.getElementById('journal-text').value = entry.text;
    
    // Update category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        const category = btn.dataset.category;
        if (selectedCategories.includes(category)) {
            btn.classList.add('selected');
            updateSelectionCounter(btn);
        } else {
            btn.classList.remove('selected');
            const counter = btn.querySelector('.selection-counter');
            if (counter) counter.remove();
        }
    });
    
    updateUI();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteEntry(entryId) {
    if (confirm('Eintrag wirklich löschen?')) {
        entries = entries.filter(e => e.id !== entryId);
        saveData();
        renderEntries();
    }
}

function renderEntries() {
    const container = document.getElementById('entries-container');
    
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state">Noch keine Einträge vorhanden. Erstelle deinen ersten Dankbarkeits-Moment! 🌟</div>';
        return;
    }

    container.innerHTML = entries.map(entry => `
        <div class="entry">
            <div class="entry-header">
                <div class="entry-date">${entry.date}</div>
                <div class="entry-actions">
                    <button class="edit-btn" onclick="editEntry(${JSON.stringify(entry).replace(/"/g, '&quot;')})">✏️</button>
                    <button class="delete-btn" onclick="deleteEntry(${entry.id})">🗑️</button>
                </div>
            </div>
            ${entry.categories.length > 0 ? `
                <div class="entry-categories">
                    ${entry.categories.map(cat => `<span class="entry-category">${cat}</span>`).join('')}
                </div>
            ` : ''}
            ${entry.text ? `<div class="entry-text">"${entry.text}"</div>` : ''}
        </div>
    `).join('');
}

// Initialize
loadData();
updateUI();
renderEntries();
