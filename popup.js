/* popup.js */

// Handle auto-fill checkbox state
document.addEventListener('DOMContentLoaded', async () => {
    const { autoFill = false } = await chrome.storage.sync.get('autoFill');
    document.getElementById('auto-fill-checkbox').checked = autoFill;
});

document.getElementById('auto-fill-checkbox').addEventListener('change', async (event) => {
    await chrome.storage.sync.set({ autoFill: event.target.checked });
});

// Handle fill-form button click
document.getElementById('fill-form-btn').addEventListener('click', () => {
    // Send message to content script to trigger form filling
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'fillForm' });
    });
});
