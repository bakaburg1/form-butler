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

chrome.runtime.onMessage.addListener(async (request) => {
    console.log('Received message:', request.action);
    
    if (request.action === "requestFormCompletion") {
        let completion = await getFormCompletion(request.formId)
        
        chrome.runtime.sendMessage({
            action: "formCompletionResult",
            result: completion
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "formFocused") {
        chrome.storage.sync.get('autoFill', (data) => {
            if (data.autoFill) {
                processFormCompletion();
            }
        });
    }
});

function processFormCompletion() {
    chrome.storage.local.get('currentForm', async (data) => {
        if (data.currentForm) {
            try {
                const result = await generateFormCompletion(data.currentForm);
                chrome.storage.local.set({ formCompletionResult: result });
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "formCompletionReady" });
                });
            } catch (error) {
                console.error('Form completion error:', error);
                // Handle error
            }
        }
    });
}

async function generateFormCompletion(formData) {
    try {
        const prompt = await loadPrompt('form_fill');
        const personalInfo = profileManager.getProfile(null, true).info;
        const message = JSON.stringify({
            formBody: formData.html, // Ensure `formHtml` is correctly referenced
            personalInfo: personalInfo
        });
        console.log('Sending form data to LLM');
        const response = await llmInterrogator.promptLLM([
            { role: "system", content: prompt },
            { role: "user", content: message }
        ]);
        console.log('Received response from LLM');
        
        const llmResponse = JSON.parse(response.content[0]);
        console.log('Parsed LLM response:', llmResponse);
        return {
            formId: formData.id,
            fieldsToFill: llmResponse.fillInstructions // Updated key
        };
    } catch (error) {
        console.error('Error in generateFormCompletion:', error);
        return { error: error.message };
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
    
    // Rename model.name to model.model
    model.model = model.name || "";
    model.apiSpecification = model.apiSpec || "openai";
    
    llmInterrogator = new LLMInterrogator(model);
    
    console.log('LLMInterrogator initialized with model:', model.name);
}

async function getFormCompletion(formBody, formId) {
    console.log('Handling form completion request for form:', formId);
    if (!llmInterrogator) {
        console.error('LLM not configured');
        callback({error: "LLM not configured"});
        return;
    }
    
    try {
        const prompt = await loadPrompt('form_fill');
        const personalInfo = profileManager.getProfile(null, true).info;
        const message = JSON.stringify({
            formBody: formBody,
            personalInfo: personalInfo
        });
        console.log('Sending form data to LLM');
        const response = await llmInterrogator.promptLLM([
            { role: "system", content: prompt },
            { role: "user", content: message }
        ]);
        console.log('Received response from LLM');
        
        const llmResponse = JSON.parse(response.content[0]);
        console.log('Parsed LLM response:', llmResponse);
        return {
            formId: formId,
            fillInstructions: llmResponse.fillInstructions
        };
    } catch (error) {
        console.error('Error in getFormCompletion:', error);
        return {error: error.message};
    }
}

async function loadPrompt(promptType) {
    console.log('Loading prompt:', promptType);
    const response = await fetch(chrome.runtime.getURL(`prompts/${promptType}.txt`));
    const promptText = await response.text();
    console.log('Prompt loaded successfully');
    return promptText;
}