/* options.js */

// Declare global variables
let modelManager;
let profileManager;

document.addEventListener('DOMContentLoaded', async function() {
    const saveLLMButton = document.getElementById('save-llm-button');
    const saveProfileButton = document.getElementById('save-profile-button');

    // Initialize managers
    modelManager = new ModelManager();
    profileManager = new ProfileManager();

    // Load fields
    await modelManager.init('#model-manager-container', 'editing');
    await profileManager.init();

    // Load last active tab
    chrome.storage.session.get(['lastActiveTab'], function(result) {
        const lastActiveTab = result.lastActiveTab || 'model';
        const tabToActivate = document.getElementById(`${lastActiveTab}-tab`);

        const tab = new bootstrap.Tab(tabToActivate);
        tab.show();
    });

    // Add event listeners for custom save events
    document.addEventListener('llmSaved', () => {
        updateStatus('llm');
    });

    document.addEventListener('llmSavingError', (event) => {
        updateStatus('llm', event.detail.error);
    });

    document.addEventListener('profileSaved', () => {
        updateStatus('profile');
    });

    document.addEventListener('profileSavingError', (event) => {
        updateStatus('profile', event.detail.error);
    });

    // Add event listeners for tab changes
    ['model', 'profile'].forEach(tabId => {
        console.log('Adding event listener for tab: ', tabId);

        const tab = document.getElementById(`${tabId}-tab`);
        tab.addEventListener('shown.bs.tab', () => {
            chrome.storage.session.set({ lastActiveTab: tabId });
        });
    });
});

function updateStatus(which, error) {
    const statusDiv = document.getElementById(which + '-status');
    const buttonId = 'save-' + which + '-button';

    statusDiv.textContent = error ? "Error while saving settings" : 'Saved successfully!';
    
    if (error) { console.log("Error while saving settings: ", error) }

    statusDiv.classList.remove('hide', 'text-danger');
    statusDiv.classList.add(error ? 'text-danger' : 'text-success');
    
    setTimeout(() => {
        document.getElementById(buttonId).disabled = false;
        statusDiv.classList.add('hide');
    }, 500);
}

