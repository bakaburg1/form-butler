/* content.js */

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

// Collect form data, excluding hidden and filled fields
function collectFormData(form) {
    console.log('Collecting form data for form:', form.id);
    const formClone = form.cloneNode(true);
    
    formClone
    .querySelectorAll('input[type="hidden"], input[type="submit"], input[type="button"], input[type="reset"], button')
    .forEach(el => el.remove());
    // Filter out non-empty fields
    formClone.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.value.trim() !== '') {
            el.remove();
        }
    });
    
    return formClone.outerHTML;
}

// Fill form fields with received data
async function fillFormFields(formId) {
    
    const form = document.getElementById(formId);
    
    if (!form) {
        console.log('Form not found for form id: ', formId);
        return;
    }
    
    const formData = await chrome.storage.local.get('formCompletionResult')
    
    if (!formData || formData.length === 0) {
        console.log('Form data not found for form id: ', formId);
        return;
    }

    if (formData.formId !== formId) {
        console.log('Form ID mismatch:', formData.formId, '!==', formId);
        return;
    }
    
    console.log('Filling form fields for form:', formId);
    
    formData.fieldsToFill.forEach(field => {
        const input = form.querySelector(`#${formId} ${field.selector}`);
        if (input) {
            console.log('Filling field:', field.selector, 'with value:', field.value);
            input.value = field.value;
        } else {
            console.warn('Field not found:', field.selector, 'in form:', formId);
        }
    });
}

// Listen for focus events on input elements
document.addEventListener('focusin', async (event) => {
    if (['input', 'textarea', 'select', 'datalist'].includes(event.target.tagName.toLowerCase()) ||
    (event.target.contentEditable && event.target.contentEditable !== 'false')) 
    {
        console.log('Focus event detected on:', event.target.tagName);
        addIdToForms(); // Add IDs to all forms without one
        
        const form = event.target.closest('form');
        
        if (!form) {
            console.log('No form found for focus event');
            return
        }
        
        console.log('Form detected:', form.id);
        
        // Store form ID in local storage
        localStorage.setItem('currentFormId', form.id);
        
        // Collect form data
        const formHtml = collectFormData(form); 
        
        // Store form data in Chrome storage
        await chrome.storage.local.set({ currentForm: { id: form.id, html: formHtml } });
        console.log('Form data stored in Chrome storage');
        
        // Send formFocused message to background
        await chrome.runtime.sendMessage({ action: 'formFocused' });
    }
});

// Listen for form completion message from background
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "formCompletionReady") {
        let currentFormId = localStorage.getItem('currentFormId');
        
        fillFormFields(currentFormId)
    }
});