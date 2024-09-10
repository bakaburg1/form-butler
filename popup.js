let currentForm = null;
let fillFormBtn = null;
let autoFillCheckbox = null;

document.addEventListener('DOMContentLoaded', () => {
    fillFormBtn = document.getElementById('fill-form-btn');
    autoFillCheckbox = document.getElementById('auto-fill-checkbox');
    
    fillFormBtn.addEventListener('click', requestFormCompletion);
    
    autoFillCheckbox.addEventListener('change', (event) => {
        chrome.storage.sync.set({autoFill: event.target.checked});
    });
    
    // Load saved auto-fill preference
    chrome.storage.sync.get('autoFill', (data) => {
        autoFillCheckbox.checked = data.autoFill || false;
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "formFocused") {
        chrome.storage.local.get('currentForm', (data) => {
            currentForm = data.currentForm;
            if (autoFillCheckbox.checked) {
                requestFormCompletion();
            }
        });
    } else if (message.action === "formCompletionResult") {
        handleFormCompletionResult(message.result);
    }
});

function requestFormCompletion() {
    if (currentForm) {
        chrome.runtime.sendMessage({
            action: "requestFormCompletion",
            formData: currentForm
        });
    }
}

function handleFormCompletionResult(result) {
    if (result.error) {
        console.error('Form completion error:', result.error);
        // Handle error in UI
    } else {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "fillForm",
                formId: result.formId,
                fieldsToFill: result.fillInstructions
            });
        });
    }
}