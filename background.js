/* background.js */

importScripts('helpers/llm-interrogator.js', 'helpers/profile-manager.js', 'helpers/model-manager.js');

let llmInterrogator;
let profileManager;
let modelManager;

chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed or updated. Initializing...');
    
    profileManager = new ProfileManager();
    await profileManager.init();
    
    modelManager = new ModelManager();
    await modelManager.init();
    
    await initializeLLMInterrogator();
    
    console.log('Initialization complete.');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Received message:', message.action);

    if (message.action === "requestFormCompletion") {
        const tabId = sender.tab.id;
        await processFormCompletion(message.formData, tabId);
    }

    // Return true to indicate async response
    return true;
});

async function processFormCompletion(formData, tabId) {
    if (!llmInterrogator) {
        console.error('LLM not configured');
        chrome.tabs.sendMessage(tabId, { action: "formCompletionError", error: "LLM not configured" });
        return;
    }

    try {
        const prompt = await loadPrompt('form_fill');
        const personalInfo = profileManager.getProfile(null, true).info;
        const messageContent = JSON.stringify({
            formBody: formData.html,
            personalInfo: personalInfo
        });
        console.log('Sending form data to LLM');

        const response = await llmInterrogator.promptLLM([
            { role: "system", content: prompt },
            { role: "user", content: messageContent }
        ]);
        console.log('Received response from LLM');

        const llmResponse = JSON.parse(response.content[0]);
        console.log('Parsed LLM response:', llmResponse);

        // Send formCompletionResult to content script
        chrome.tabs.sendMessage(tabId, {
            action: "formCompletionReady",
            formId: formData.id,
            fillInstructions: llmResponse.fillInstructions
        });
    } catch (error) {
        console.error('Error in processFormCompletion:', error);
        chrome.tabs.sendMessage(tabId, { action: "formCompletionError", error: error.message });
    }
}

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
    
    model.model = model.name || "";
    model.apiSpecification = model.apiSpec || "openai";
    
    llmInterrogator = new LLMInterrogator(model);
    
    console.log('LLMInterrogator initialized with model:', model.name);
}

async function loadPrompt(promptType) {
    console.log('Loading prompt:', promptType);
    const response = await fetch(chrome.runtime.getURL(`prompts/${promptType}.txt`));
    const promptText = await response.text();
    console.log('Prompt loaded successfully');
    return promptText;
}
