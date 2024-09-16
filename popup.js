/* popup.js */

// Initialize managers
const modelManager = new ModelManager();
const profileManager = new ProfileManager();
const cardManager = new CardManager(); // Initialize CardManager

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
    await profileManager.init('#profile-manager-container', 'selection');
    await cardManager.init('#card-manager-container', 'selection'); // Initialize CardManager with a container

    // Initialize Enable/Disable Extension Checkbox
    const enableCheckbox = document.getElementById('enable-extension-checkbox');
    const fillFormBtn = document.getElementById('fill-form-btn');

    // Load the checkbox state from storage
    const { extensionEnabled = true } = await chrome.storage.sync.get('extensionEnabled');
    enableCheckbox.checked = extensionEnabled;
    fillFormBtn.disabled = !extensionEnabled;

    // Add event listener for checkbox changes
    enableCheckbox.addEventListener('change', async (event) => {
        const isEnabled = event.target.checked;
        await chrome.storage.sync.set({ extensionEnabled: isEnabled });
        fillFormBtn.disabled = !isEnabled;
    });

    // Rename the stored preference to 'useStoredCompletion'
    const { useStoredCompletion = true } = await chrome.storage.sync.get('useStoredCompletion');
    document.getElementById('use-stored-completion-checkbox').checked = useStoredCompletion;

    document.getElementById('use-stored-completion-checkbox').addEventListener('change', async (event) => {
        await chrome.storage.sync.set({ useStoredCompletion: event.target.checked });
    });

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


