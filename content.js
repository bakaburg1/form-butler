console.log('Content script loaded');

// Generate a unique identifier for the form
function generateFormId(form, index) {
    let parentWithId = form.closest('[id]');
    return parentWithId 
        ? `${parentWithId.id}_form${index}`
        : `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Add IDs to all forms without one
function addIdToForms() {
    console.log('Adding IDs to forms without one');
    document.querySelectorAll('form:not([id])').forEach((form, index) => {
        form.id = generateFormId(form, index);
        console.log('Added ID to form:', form.id);
    });
}

// Wrap Chrome API calls in a function to check for valid context
function safelyExecuteChromeAPI(callback) {
    if (chrome && chrome.runtime && chrome.runtime.id) {
        try {
            callback();
        } catch (error) {
            console.error('Chrome API error:', error);
        }
    } else {
        console.log('Extension context invalid. Unable to execute Chrome API.');
    }
}

// Collect form data, excluding hidden and filled fields
function collectFormData(form) {
    console.log('Collecting form data for form:', form.id);
    const formClone = form.cloneNode(true);
    
    formClone.querySelectorAll('input[type="hidden"], input[type="submit"], input[type="button"], input[type="reset"], button').forEach(el => el.remove());
    
    formClone.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.value) {
            el.setAttribute('value', '');
            el.value = '';
        }
    });
    
    return formClone.outerHTML;
}

// Fill form fields with received data
function fillFormFields(formId, fieldsToFill) {
    console.log('Filling form fields for form:', formId);
    const form = document.getElementById(formId);
    if (form) {
        fieldsToFill.forEach(field => {
            const input = form.querySelector(field.selector);
            if (input) {
                console.log('Filling field:', field.selector, 'with value:', field.value);
                input.value = field.value;
            } else {
                console.warn('Field not found:', field.selector);
            }
        });
    } else {
        console.error('Form not found:', formId);
    }
}

// Listen for focus events on input elements
document.addEventListener('focusin', function(event) {
    if (['input', 'textarea', 'select', 'datalist'].includes(event.target.tagName.toLowerCase()) ||
        (event.target.contentEditable && event.target.contentEditable !== 'false')) 
    {
        console.log('Focus event detected on:', event.target.tagName);
        addIdToForms();

        const form = event.target.closest('form');
        if (form) {
            console.log('Form detected:', form.id);
            const formHtml = collectFormData(form);
            console.log('Collected form data:', formHtml);
            safelyExecuteChromeAPI(() => {
                console.log('Sending formFocused message to background');
                chrome.runtime.sendMessage({ action: 'formFocused', formId: form.id, formBody: formHtml }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to send message:', chrome.runtime.lastError);
                    } else {
                        console.log('Received response from background:', response);
                    }
                });
            });
        }
    }
});

// Listen for messages from the plugin
safelyExecuteChromeAPI(() => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Received message in content script:', message);
        if (message.action === 'fillForm') {
            fillFormFields(message.formId, message.fieldsToFill);
        }
    });
});

// Check AutoFill setting and add event listener if enabled
safelyExecuteChromeAPI(() => {
    chrome.storage.sync.get('autoFill', (data) => {
        console.log('AutoFill setting:', data.autoFill);
        if (data.autoFill) {
            document.addEventListener('focusin', (event) => {
                if (event.target.tagName === 'INPUT') {
                    console.log('AutoFill triggered for input:', event.target);
                    fillFormField(event.target);
                }
            });
        }
    });
});