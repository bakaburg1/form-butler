// options.js

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
    await modelManager.init();
    await profileManager.init();

    // Load last active tab
    chrome.storage.session.get(['lastActiveTab'], function(result) {
        const lastActiveTab = result.lastActiveTab || 'llm';
        const tabToActivate = document.getElementById(`${lastActiveTab}-tab`);
        const tab = new bootstrap.Tab(tabToActivate);
        tab.show();
    });

    saveLLMButton.addEventListener('click', async function() {
        saveLLMButton.disabled = true;
        try {
            await modelManager.saveModel();
            updateStatus('llm');
        } catch (error) {
            updateStatus('llm', error);
        }
    });

    saveProfileButton.addEventListener('click', async function() {
        saveProfileButton.disabled = true;
        try {
            await profileManager.saveProfileData();
            updateStatus('profile');
        } catch (error) {
            updateStatus('profile', error);
        }
    });

    // Add event listeners for tab changes
    ['llm', 'profile'].forEach(tabId => {
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

