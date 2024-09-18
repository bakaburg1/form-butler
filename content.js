/* content.js */

console.log('Content script loaded');

let isRequestPending = false;

/**
 * Applies the animation to a filled field.
 * @param {HTMLElement} element - The input element to animate.
 */
function animateFilledField(element) {
    element.classList.add('form-butler-highlight-animation');
    setTimeout(() => {
        element.classList.remove('form-butler-highlight-animation');
    }, 1000);
}

/**
 * Generates a unique identifier for the form.
 * @param {HTMLFormElement} form - The form element.
 * @param {number} index - The index of the form.
 * @returns {string} The generated form ID.
 */
function generateFormId(form, index) {
    let parentWithId = form.closest('[id]');
    return parentWithId 
        ? `${parentWithId.id}_form${index}`
        : `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Adds unique IDs to all forms on the page that do not have one.
 */
function addIdToForms() {
    console.log('Adding IDs to forms without one');
    document.querySelectorAll('form:not([id])').forEach((form, index) => {
        form.id = generateFormId(form, index);
        console.log('Added ID to form:', form.id);
    });
}

/**
 * Collects form data, excluding hidden and filled fields.
 * @param {HTMLFormElement} form - The form element.
 * @returns {Object} An object containing the form ID, HTML, and URL.
 */
function collectFormData(form) {
    console.log('Collecting form data for form:', form.id);
    const formClone = form.cloneNode(true);

    // Remove unnecessary elements
    formClone
        .querySelectorAll('input[type="hidden"], input[type="submit"], input[type="button"], input[type="reset"], button')
        .forEach(el => el.remove());

    // Remove non-empty fields
    formClone.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.value.trim() !== '') {
            el.remove();
        }
    });

    const formHtml = formClone.outerHTML;

    // Get the current page URL
    const url = window.location.href;

    return { id: form.id, html: formHtml, url: url };
}

/**
 * Retrieves the formsData array from chrome.storage.local.
 * If formId or url is provided, it returns the specific form.
 * 
 * @param {string} [formId] - Optional ID of the form to retrieve.
 * @param {string} [url=window.location.href] - Optional URL of the form, defaults to current page.
 * @returns {Promise<Array|Object|null>} The array of forms data, specific form, or null if not found.
 */
async function getFormsData(formId = null, url = window.location.href) {
    const result = await chrome.storage.local.get('formsData');
    const formsData = result.formsData || [];

    if (!formId && !url) {
        return formsData;
    }

    let filteredFormsData = formsData;

    if (formId || url) { // Updated condition to always filter by URL
        filteredFormsData = formsData.filter(form => 
            (!formId || form.id === formId) && // true if formId is not provided or if form.id is equal to formId
            form.url === url // true if form.url is equal to url    
        );
    }

    if (formId) {
        filteredFormsData = filteredFormsData.find(form => form.id === formId);
    }

    return filteredFormsData;
}

/**
 * Retrieves the on which the user is currently focused
 * 
 * @returns {Promise<Array>} The array of forms data.
 */
async function getFocusedForm() {
    const thisSiteForms = await getFormsData();
    return thisSiteForms.find(form => form.focused);
}

/**
 * Sets the formsData array in chrome.storage.local.
 * @param {Array} data - The forms data array to store.
 * @returns {Promise<void>}
 */
async function setFormsData(data) {
    await chrome.storage.local.set({ formsData: data });
}

/**
 * Merges new instructions with existing instructions.
 * 
 * @param {Array} existingInstructions - The existing instructions array.
 * @param {Array} newInstructions - The new instructions array to merge.
 * @returns {Array} The merged instructions array.
 */
function mergeInstructions(existingInstructions, newInstructions) {
    if (!existingInstructions) {
        existingInstructions = newInstructions;
    } else {
        newInstructions.forEach(newInstruction => {
            const existingIndex = existingInstructions.findIndex(
                instruction => instruction.selector === newInstruction.selector
            );
            if (existingIndex !== -1) {
                existingInstructions[existingIndex] = newInstruction;
            } else {
                existingInstructions.push(newInstruction);
            }
        });
    }

    return existingInstructions;
}

/**
 * Updates the formsData with a new or existing form.
 * @param {Object} newForm - The form data object to add or update.
 * @returns {Promise<void>}
 */
async function updateFormsData(newForm) {
    let formsData = await getFormsData(url = null); // Get all forms

    // Set 'focused' flag to false for all forms
    formsData.forEach(form => form.focused = false);

    // Check if the form is already in formsData based on id and url
    let existingForm = formsData.find(form => form.id === newForm.id && form.url === newForm.url);

    if (existingForm) {
        // Update existing form's data with newForm data
        Object.assign(existingForm, newForm);

        // Set focused flag to true for the existing form
        existingForm.focused = true;
    } else {
        // Add new form data with focused and fulfilled flags
        newForm.focused = true;
        newForm.fulfilled = false;
        formsData.push(newForm);
    }

    await setFormsData(formsData);
}

/**
 * Retrieves the 'autoFill' setting from chrome.storage.sync.
 * @returns {Promise<boolean>} The autoFill setting.
 */
async function getAutoFillSetting() {
    const result = await chrome.storage.sync.get('autoFill');
    return result.autoFill || false;
}

/**
 * Fills the form fields with the provided instructions.
 * @param {string} formId - The ID of the form to fill.
 * @param {Array} fillInstructions - The instructions on how to fill the form fields.
 */
async function fillFormFields(formId, fillInstructions) {
    const form = document.getElementById(formId);

    if (!form) {
        console.log('Form not found for form id:', formId);
        return;
    }

    console.log('Filling form fields for form:', formId);

    for (const field of fillInstructions) {
        const input = form.querySelector(field.selector);
        if (input && !input.value.trim() && field.value) { // Only fill if not already filled and if value is provided

            console.log('Filling field:', field.selector, 'with value:', field.value);

            switch(field.type) {
                case 'select':
                    input.value = field.value;
                    const option = input.querySelector(`option[value='${field.value}']`);
                    if (option) {
                        option.selected = true;
                    }
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                case 'checkbox':
                    input.checked = field.value === true || field.value === 'true';
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                case 'radio':
                    const radio = form.querySelector(`${field.selector}[value='${field.value}']`);
                    if (radio) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    break;
                default:
                    input.value = field.value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
            }

        } else {
            console.log('Field not found or already filled:', field.selector, 'in form:', formId);
        }
    }
}

/**
 * Requests form completion by sending a message to the background script.
 */
async function requestFormCompletion() {
    
    // Check if the extension is enabled
    const { extensionEnabled = true } = await chrome.storage.sync.get('extensionEnabled');
    if (!extensionEnabled) {
        console.log('Extension is disabled. Skipping form completion.');
        return;
    }

    if (isRequestPending) {
        console.log('Form completion request is already pending.');
        return;
    }
    
    isRequestPending = true;

    const focusedForm = await getFocusedForm();

    if (!focusedForm) {
        console.log('No form has been focused');
        return;
    }
    
    const { useStoredCompletion } = await chrome.storage.sync.get('useStoredCompletion');

    // Add processing class to the form
    const formElement = document.getElementById(focusedForm.id);
    formElement.classList.add('form-butler-processing');

    // Check if the form has already been fulfilled and if the user has opted to use stored completion
    const shouldUseStored = focusedForm.fulfilled && useStoredCompletion;

    if (!shouldUseStored) {
        console.log('Requesting form completion for form:', focusedForm.id);
        // Request form completion from background script
        chrome.runtime.sendMessage({ action: 'requestFormCompletion', formData: focusedForm });
    } else {
        console.log('Form already fulfilled, applying saved fill instructions.');

        // Fill the form with the saved fill instructions
        if (focusedForm.fillInstructions) {
            await fillFormFields(focusedForm.id, focusedForm.fillInstructions);
        } else {
            console.log('No fill instructions found for fulfilled form.');
        }

        formElement.classList.remove('form-butler-processing');
        isRequestPending = false;
    }
}

// Listen for focus events on input elements
document.addEventListener('focusin', async (event) => {

    if (isRequestPending) {
        console.log('Form completion request is already pending. Focus event ignored.');
        return;
    }


    if (['input', 'textarea', 'select', 'datalist'].includes(event.target.tagName.toLowerCase()) ||
        (event.target.contentEditable && event.target.contentEditable !== 'false')) 
    {
        console.log('Focus event detected on:', event.target.tagName);
        addIdToForms(); // Add IDs to all forms without one

        const form = event.target.closest('form');

        if (!form) {
            // TODO: Handle input fields outside of forms
            console.log('No form found for focus event');
            return;
        }

        console.log('Form detected:', form.id);

        // Collect form data
        const formData = collectFormData(form);

        // Update formsData in storage with focus
        await updateFormsData(formData);

        // Check if autoFill is enabled
        const autoFill = await getAutoFillSetting();

        if (autoFill) {
            // Request form completion from background script
            requestFormCompletion();
        }
    }
});

/**
 * Handles messages received from the background script or popup.
 */
chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action === "formCompletionReady") {
        // Update formsData with fillInstructions
        let form = await getFormsData(message.formId);

        if (form) {
            form.fillInstructions = mergeInstructions(form.fillInstructions, message.fillInstructions); 
            form.fulfilled = true;

            await updateFormsData(form);

            // Fill the form
            fillFormFields(message.formId, message.fillInstructions);

            // Remove processing class from the form
            const formElement = document.getElementById(message.formId);
            formElement.classList.remove('form-butler-processing');
            isRequestPending = false;
        } else {
            console.warn('Form not found in formsData:', message.formId);
        }

    } else if (message.action === "formCompletionError") {

        console.error('Form completion error:', message.error);

        const formElement = document.getElementById(message.formId)
        formElement.classList.remove('form-butler-processing');
        isRequestPending = false;

    } else if (message.action === "fillForm") {
        
        // Handle manual fill request from popup
        requestFormCompletion()
    }
});