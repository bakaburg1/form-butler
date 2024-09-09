// Generate a unique identifier for the form
function generateFormId(form, index) {
    
    let parentWithId = form.closest('[id]');
    if (parentWithId) {
        let parentId = parentWithId.id;
        return `${parentId}_form${index}`;
    }
    
    return `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Add IDs to all forms without one
function addIdToForms() {
    const forms = document.querySelectorAll('form:not([id])');
    forms.forEach((form, index) => {
        const newId = generateFormId(form, index);
        form.id = newId;
    });
}

// Listen for focus events on input elements
document.addEventListener('focusin', function(event) {
    if (['input', 'textarea', 'select', 'datalist'].includes(event.target.tagName.toLowerCase()) ||
    (event.target.contentEditable && event.target.contentEditable !== 'false')) 
    {
        // Ensure all forms have IDs
        addIdToForms();

        // Identify the form that is currently focused
        const form = event.target.closest('form');

        if (form) {
            const formHtml = collectFormData(form);
            // Send the form data to the background script
            chrome.runtime.sendMessage({ action: 'formFocused', formId: form.id, formBody: formHtml });
        }
    }
});

// Collect form data, excluding hidden and filled fields
function collectFormData(form) {
    // Clone the form to avoid modifying the original
    const formClone = form.cloneNode(true);
    
    // Remove hidden inputs and similar fields
    formClone.querySelectorAll('input[type="hidden"], input[type="submit"], input[type="button"], input[type="reset"], button').forEach(el => el.remove());
    
    // Remove values from inputs
    formClone.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.value) {
            el.setAttribute('value', '');
            el.value = '';
        }
    });
    
    // Return the cleaned HTML structure
    return formClone.outerHTML;
}

// Listen for messages from the plugin
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fillForm') {
        fillFormFields(message.formId, message.fieldsToFill);
    }
});

// Fill form fields with received data
function fillFormFields(formId, fieldsToFill) {
    const form = document.getElementById(formId);
    if (form) {
        fieldsToFill.forEach(field => {
            const input = form.querySelector(field.selector);
            if (input) {
                input.value = field.value;
            }
        });
    }
}
