importScripts('helpers/llm-interrogator.js', 'helpers/profile-manager.js');

let llmInterrogator;
let profileManager;

chrome.runtime.onInstalled.addListener(async () => {
  // Initialize the LLMInterrogator when the extension is installed or updated
  await initializeLLMInterrogator();
  
  // Initialize ProfileManager
  profileManager = new ProfileManager();
  await profileManager.init();
});

async function initializeLLMInterrogator() {
  const result = await chrome.storage.sync.get(['currentModel']);
  if (result.currentModel) {
    const model = result.currentModel;
    const options = {
      apiSpecification: model.apiSpecification,
      endpoint: model.endpoint,
      model: model.name || "",
      apiKey: model.apiKey,
      apiVersion: model.apiVersion
    };
    llmInterrogator = new LLMInterrogator(options);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    handleFormFill(request.formData, sendResponse);
  }
  return true; // Indicates that the response is asynchronous
});

async function handleFormFill(formData, sendResponse) {
  if (!llmInterrogator) {
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
    const response = await llmInterrogator.promptLLM([
      { role: "system", content: prompt },
      { role: "user", content: message }
    ]);
    sendResponse({response: response.content[0]});
  } catch (error) {
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
  const response = await fetch(chrome.runtime.getURL(`prompts/${promptType}.txt`));
  return await response.text();
}