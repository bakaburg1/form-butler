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

async function initializeLLMInterrogator(modelLabel = null) {
    console.log('Initializing LLMInterrogator...');
    
    const model = await modelManager.getModel(modelLabel);
    
    if (!model) {
        msg = 'No model found. LLMInterrogator not initialized.';
        console.log(msg);
        chrome.runtime.sendMessage({
            action: "llmError",
            error: msg
        });
        return;
    }
    
    if (!(model.apiSpecification && model.endpoint && model.apiKey)) {
        msg = 'Missing required model properties. LLMInterrogator not initialized.';
        console.log(msg);
        chrome.runtime.sendMessage({
            action: "llmError",
            error: msg
        });
        return;
    }   
    
    const options = {
        apiSpecification: model.apiSpecification,
        endpoint: model.endpoint,
        model: model.name || "",
        apiKey: model.apiKey,
        apiVersion: model.apiVersion
    };

    llmInterrogator = new LLMInterrogator(options);

    console.log('LLMInterrogator initialized with model:', model.name);
    
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action);
    if (request.action === "fillForm") {
        handleFormFill(request.formData, sendResponse);
    } else if (request.action === "formFocused") {
        handleFormFocused(request.formBody, request.formId, sendResponse);
    }
    return true;
});

async function handleFormFill(formData, sendResponse) {
    console.log('Handling form fill request');
    if (!llmInterrogator) {
        console.error('LLM not configured');
        sendResponse({error: "LLM not configured"});
        return;
    }
    
    try {
        const prompt = await loadPrompt('form_fill');
        const personalInfo = profileManager.getProfile(null, true).info;
        const message = JSON.stringify({
            formData: formData,
            personalInfo: personalInfo
        });
        console.log('Sending prompt to LLM');
        const response = await llmInterrogator.promptLLM([
            { role: "system", content: prompt },
            { role: "user", content: message }
        ]);
        console.log('Received response from LLM');
        sendResponse({response: response.content[0]});
    } catch (error) {
        console.error('Error in handleFormFill:', error);
        sendResponse({error: error.message});
    }
}

async function handleFormFocused(formBody, formId, sendResponse) {
    console.log('Handling form focused event for form:', formId);
    if (!llmInterrogator) {
        console.error('LLM not configured');
        sendResponse({error: "LLM not configured"});
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
        sendResponse({
            formId: formId,
            fillInstructions: llmResponse
        });
    } catch (error) {
        console.error('Error in handleFormFocused:', error);
        sendResponse({error: error.message});
    }
}

async function loadPrompt(promptType) {
    console.log('Loading prompt:', promptType);
    const response = await fetch(chrome.runtime.getURL(`prompts/${promptType}.txt`));
    const promptText = await response.text();
    console.log('Prompt loaded successfully');
    return promptText;
}