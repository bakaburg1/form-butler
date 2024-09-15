/* popup.js */

// Initialize managers
const modelManager = new ModelManager();
const profileManager = new ProfileManager();

document.addEventListener('DOMContentLoaded', async () => {
    // Handle auto-fill checkbox state
    const { autoFill = false } = await chrome.storage.sync.get('autoFill');
    document.getElementById('auto-fill-checkbox').checked = autoFill;

    // Add event listener for cog button
    document.getElementById('open-options-btn').addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Initialize managers
    await modelManager.init('#model-manager-container', 'selection');
    await profileManager.init();

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
