/* content.js */

console.log('Content script loaded');

// Function to generate a unique identifier for the form
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

// Function to get formsData from storage
async function getFormsData() {
    const result = await chrome.storage.local.get('formsData');
    return result.formsData || [];
}

// Function to set formsData in storage
async function setFormsData(data) {
    await chrome.storage.local.set({ formsData: data });
}

// Function to update formsData with a new form
async function updateFormsData(newForm) {
    let formsData = await getFormsData();

    // Set 'focused' flag to false for all forms
    formsData.forEach(form => form.focused = false);

    // Check if the form is already in formsData
    let existingForm = formsData.find(form => form.id === newForm.id);

    if (existingForm) {
        // Update existing form
        existingForm.focused = true;
    } else {
        // Add new form
        newForm.focused = true;
        newForm.fulfilled = false;
        formsData.push(newForm);
    }

    await setFormsData(formsData);
}

// Function to get 'autoFill' setting
async function getAutoFillSetting() {
    const result = await chrome.storage.sync.get('autoFill');
    return result.autoFill || false;
}

// Function to fill form fields with received data
function fillFormFields(formId, fillInstructions) {
    const form = document.getElementById(formId);

    if (!form) {
        console.log('Form not found for form id:', formId);
        return;
    }

    console.log('Filling form fields for form:', formId);

    fillInstructions.forEach(field => {
        const input = form.querySelector(field.selector);
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
            return;
        }

        console.log('Form detected:', form.id);

        // Collect form data
        const formHtml = collectFormData(form);

        const formData = { id: form.id, html: formHtml };

        // Update formsData in storage
        await updateFormsData(formData);

        // Check if autoFill is enabled
        const autoFill = await getAutoFillSetting();

        if (autoFill) {
            // Get updated formsData
            const formsData = await getFormsData();

            // Find the focused form
            const focusedForm = formsData.find(form => form.id === formData.id);

            if (focusedForm && !focusedForm.fulfilled) {
                // Send requestFormCompletion message to background script
                chrome.runtime.sendMessage({ action: 'requestFormCompletion', formData: formData });
            } else {
                console.log('Form already fulfilled or not found');
            }
        }
    }
});

// Listen for messages
chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action === "formCompletionResult") {
        // Update formsData with fillInstructions and set fulfilled flag
        let formsData = await getFormsData();

        const formIndex = formsData.findIndex(form => form.id === message.formId);

        if (formIndex !== -1) {
            formsData[formIndex].fillInstructions = message.fillInstructions;
            formsData[formIndex].fulfilled = true;

            await setFormsData(formsData);

            // Fill the form
            fillFormFields(message.formId, message.fillInstructions);
        } else {
            console.warn('Form not found in formsData:', message.formId);
        }
    } else if (message.action === "formCompletionError") {
        console.error('Form completion error:', message.error);
        // Optionally display an error message to the user
    } else if (message.action === "fillForm") {
        // Handle fillForm request from popup

        // Get formsData
        const formsData = await getFormsData();

        // Find the focused form
        const focusedForm = formsData.find(form => form.focused);

        if (focusedForm) {
            if (!focusedForm.fulfilled) {
                // Send requestFormCompletion message to background script
                chrome.runtime.sendMessage({ action: 'requestFormCompletion', formData: focusedForm });
            } else {
                // Form already fulfilled, fill the form
                fillFormFields(focusedForm.id, focusedForm.fillInstructions);
            }
        } else {
            console.log('No focused form found');
        }
    }
});
