let autoFillCheckbox = null;

document.addEventListener('DOMContentLoaded', () => {
    autoFillCheckbox = document.getElementById('auto-fill-checkbox');
    
    autoFillCheckbox.addEventListener('change', (event) => {
        chrome.storage.sync.set({autoFill: event.target.checked});
    });
    
    // Load saved auto-fill preference
    chrome.storage.sync.get('autoFill', (data) => {
        autoFillCheckbox.checked = data.autoFill || false;
    });
});

// Remove other event listeners and functions related to form filling
// as they are now handled by the background script