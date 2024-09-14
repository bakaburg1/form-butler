/* background.js */

// Import helper scripts
importScripts('helpers/llm-interrogator.js', 'helpers/profile-manager.js', 'helpers/model-manager.js');

// Initialize managers
let llmInterrogator;
let profileManager;
let modelManager;

// Initialize on installation or update
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed or updated. Initializing...');
    
    // Initialize profile manager
    profileManager = new ProfileManager();
    await profileManager.init();
    
    // Initialize model manager
    modelManager = new ModelManager();
    await modelManager.init();
    
    // Initialize LLM interrogator
    await initializeLLMInterrogator();
    
    console.log('Initialization complete.');
});

// Single message listener to handle all incoming messages
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Received message:', message.action);

    if (message.action === "requestFormCompletion") {
        const tabId = sender.tab.id;
        await processFormCompletion(message.formData, tabId);
    }

    // Indicate that response will be sent asynchronously
    return true;
});

/**
 * Processes the form completion request by sending form data to the LLM and
 * returning the completion instructions.
 * 
 * @param {Object} formData - The form data containing id, html, and url.
 * @param {number} tabId - The ID of the tab requesting the completion.
 */
async function processFormCompletion(formData, tabId) {
    if (!llmInterrogator) {
        console.error('LLM not configured');
        chrome.tabs.sendMessage(tabId, { action: "formCompletionError", error: "LLM not configured" });
        return;
    }

    try {
        // Load the prompt for form filling
        const prompt = await loadPrompt('form_fill');

        // Get user personal information
        const personalInfo = profileManager.getProfile(null, true).info;

        // Prepare message content for the LLM
        const messageContent = JSON.stringify({
            formBody: formData.html,
            personalInfo: personalInfo
        });

        console.log('Sending form data to LLM');

        // Send the prompt and message to the LLM
        const response = await llmInterrogator.promptLLM([
            { role: "system", content: prompt },
            { role: "user", content: messageContent }
        ]);

        console.log('Received response from LLM');

        // Parse the LLM response
        const llmResponse = JSON.parse(response.content[0]);
        console.log('Parsed LLM response:', llmResponse);

        // Send the completion instructions back to the content script
        chrome.tabs.sendMessage(tabId, {
            action: "formCompletionReady",
            formId: formData.id,
            fillInstructions: llmResponse.fillInstructions
        });
    } catch (error) {
        console.error('Error in processFormCompletion:', error);
        // Send error back to the content script
        chrome.tabs.sendMessage(tabId, { action: "formCompletionError", error: error.message });
    }
}

/**
 * Initializes the LLM interrogator with the selected model.
 * 
 * @param {string|null} modelLabel - Optional label to select a specific model.
 */
async function initializeLLMInterrogator(modelLabel = null) {
    console.log('Initializing LLMInterrogator...');

    const model = modelManager.getModel(modelLabel);

    console.log('Model:', model);
    console.log('Stored data:', await chrome.storage.sync.get());

    if (!model) {
        throw new Error('No model found. LLMInterrogator not initialized.');
    }

    if (!(model.apiSpec && model.endpoint && model.apiKey)) {
        throw new Error('Missing required model properties. LLMInterrogator not initialized.');
    }   

    // Rename model.name to model.model
    model.model = model.name || "";
    model.apiSpecification = model.apiSpec || "openai";

    // Initialize the LLM interrogator with the model
    llmInterrogator = new LLMInterrogator(model);

    console.log('LLMInterrogator initialized with model:', model.name);
}

/**
 * Loads the specified prompt from the extension's prompts directory.
 * 
 * @param {string} promptType - The type of prompt to load.
 * @returns {string} The loaded prompt text.
 */
async function loadPrompt(promptType) {
    console.log('Loading prompt:', promptType);
    const response = await fetch(chrome.runtime.getURL(`prompts/${promptType}.txt`));
    const promptText = await response.text();
    console.log('Prompt loaded successfully');
    return promptText;
}
