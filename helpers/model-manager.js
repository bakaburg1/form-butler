/**
* Manages LLM (Language Learning Model) configurations for the Chrome
* extension. This class handles various operations related to models,
* including:
* - Selection and display of models in a dropdown menu
* - Saving and deleting model configurations
* - Updating UI elements based on selected models
* - Handling user interactions with the model management interface
*/
class ModelManager {
    /**
    * Initializes the ModelManager.
    * Sets up DOM element references, initializes model-related variables.
    */
    constructor() {
        this.containerElement = null;
        this.mode = null;
        
        // DOM element references
        this.apiSpecInput = null;
        this.searchInput = null;
        this.dropdownMenu = null;
        this.modelInput = null;
        this.endpointInput = null;
        this.apiKeyInput = null;
        this.saveButton = null;
        this.azureApiVersionDiv = null;
        this.azureApiVersionInput = null;
        this.llmStatus = null;
        this.modelInputLabel = null;
        
        // Default values and state variables
        this.defaultAPISpec = 'openai';
        this.models = []; // Array to store all available models
        this.currentModel = null; // Now stores only the model label
    }
    
    /**
    * Initializes the ModelManager by performing the following steps:
    * 1. Loads saved models and current model from storage
    * 2. Sets up the container element and mode
    * 3. Initializes DOM references, event listeners, and models
    * 4. Loads fields for the current model if in editing mode
    * 5. Updates the search input and dropdown menu UI
    *
    * @param {string} [containerElement="#model-manager-container"] - The
    * selector for the container element
    * @param {string} [mode='editing'] - The mode of operation ('editing' or
    * 'selection')
    * @returns {Promise<void>}
    */
    async init(containerElement = "#model-manager-container", mode = 'editing') {
        const result = await chrome.storage.sync.get(['models', 'currentModel']);
        this.models = result.models || [];
        this.currentModel = result.currentModel || (this.models.length > 0 ? this.models[0].label : null);
        
        this.mode = mode;
        
        if (!this.isValidPage()) {
            console.log('Model manager initialized in no-UI mode');
            return;
        }

        this.containerElement = document.querySelector(containerElement);
        
        if (!this.containerElement) {
            console.log('Model manager container element not found');
            return;
        }
        
        this.initializeDOMReferences();
        this.initializeEventListeners();
        this.initializeModels();

        // Show the current model
        this.selectModel(this.currentModel);
        
        this.updateSearchInput();
        this.updateDropdownMenu();
    }
    
    /**
    * Checks if the current page is the options page or the popup page.
    * @returns {boolean} True if the current page is the options page or the popup page, false otherwise.
    */
    isValidPage() {
        return location.pathname.includes('options.html') || location.pathname.includes('popup.html');
    }
    
    /**
    * Initializes DOM element references.
    * If a container element is provided, it generates the UI elements dynamically.
    * Otherwise, it references existing elements in the DOM.
    */
    initializeDOMReferences() {
        if (this.containerElement) {
            if (this.mode === 'editing') {
                this.createEditingUI();
            } else if (this.mode === 'selection') {
                this.createSelectionUI();
            }
        }
        
        // Reference existing elements
        this.searchInput = document.getElementById('model-search');
        this.dropdownMenu = document.getElementById('model-dropdown-menu');
        
        if (this.mode === 'editing') {
            this.apiSpecInput = document.getElementById('api-specification');
            this.modelInput = document.getElementById('model-input');
            this.endpointInput = document.getElementById('endpoint-input');
            this.apiKeyInput = document.getElementById('api-key-input');
            this.saveButton = document.getElementById('save-llm-button');
            this.azureApiVersionDiv = document.getElementById('azure-api-version-div');
            this.azureApiVersionInput = document.getElementById('azure-api-version');
            this.llmStatus = document.getElementById('llm-status');
            this.modelInputLabel = document.getElementById('model_input_label');
        }
    }
    
    /**
    * Generates the editing UI using the provided HTML structure and appends it to the container element.
    */
    createEditingUI() {
        const editingTemplate = `
            <form id="llm-form" class="options-form">
                <div class="dropdown form-group">
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <input type="text" id="model-search" class="form-control" placeholder="Search models">
                    </div>
                    <ul class="dropdown-menu" id="model-dropdown-menu">
                        <!-- Dropdown items will be dynamically populated here -->
                    </ul>
                </div>
        
                <div class="form-group">
                    <label for="api-specification">API type</label>
                    <select id="api-specification" class="form-select">
                        <option value="openai">OpenAI</option>
                        <option value="azure">Azure</option>
                    </select>
                </div>
        
                <div class="form-group">
                    <label for="model-input" id="model_input_label">Model name</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-robot"></i></span>
                        <input type="text" id="model-input" class="form-control" placeholder="Model name">
                    </div>
                </div>
        
                <div class="form-group">
                    <label for="endpoint-input">Endpoint URL</label>
                    <div class="input-group">
                        <span class="input-group-text">@</span>
                        <input type="text" id="endpoint-input" class="form-control" placeholder="Endpoint URL">
                    </div>
                </div>
        
                <div class="form-group">
                    <label for="api-key-input">API Key</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-key"></i></span>
                        <input type="password" id="api-key-input" class="form-control" placeholder="API Key">
                    </div>
                </div>
        
                <div class="form-group d-none" id="azure-api-version-div">
                    <label for="azure-api-version">API Version</label>
                    <input type="text" id="azure-api-version" class="form-control">
                </div>
            </form>
            <div class="row mt-3 align-items-center">
                <div class="col-auto">
                    <button id="save-llm-button" class="btn btn-primary">Save LLM Settings</button>
                </div>
                <div class="col">
                    <div id="llm-status" class="status-message hide"></div>
                </div>
            </div>
        `;
        this.containerElement.innerHTML = editingTemplate;
    }
    
    /**
    * Generates the selection UI using the provided HTML structure and appends it to the container element.
    */
    createSelectionUI() {
        const selectionTemplate = `
            <div class="dropdown form-group">
                <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" id="model-search" class="form-control" placeholder="Search models">
                </div>
                <ul class="dropdown-menu" id="model-dropdown-menu">
                    <!-- Dropdown items will be dynamically populated here -->
                </ul>
            </div>
        `;
        this.containerElement.innerHTML = selectionTemplate;
    }
    
    /**
    * Sets up event listeners for various UI elements to handle user interactions.
    * This includes listeners for the search input, dropdown menu, save button, and API specification changes.
    */
    initializeEventListeners() {
        if (!(this.containerElement || this.isValidPage())) return;
        
        this.searchInput.addEventListener('focus', () => this.showDropdown());
        this.searchInput.addEventListener('input', () => this.filterModels());
        this.dropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        
        document.addEventListener('click', (event) => this.handleClickOutside(event));
        
        if (this.mode === 'editing') {
            if (this.saveButton) {
                this.saveButton.addEventListener('click', () => this.saveModel());
            }
            if (this.apiSpecInput) {
                this.apiSpecInput.addEventListener('change', () => this.handleAPIChange());
            }

            if (this.endpointInput && this.apiSpecInput.value === "openai") {
                this.endpointInput.addEventListener('input', () => {
                    let value = this.endpointInput.value;
                    const regex = /\/v1\/chat\/completions$/;
                    if (regex.test(value)) {
                        this.endpointInput.value = value.replace(regex, '');
                    }
                });
            }
        }
    }
    
    /**
    * Initializes models by ensuring each model has a unique label.
    */
    initializeModels() {
        this.models = this.models.map(model => {
            if (!model.label) {
                model.label = this.getModelLabel(model);
            }
            return model;
        });
    }
    
    /**
    * Loads saved fields for the current model. If a current model exists,
    * populates the UI fields with its data.
    */
    loadFields() {
        
        if (!(this.containerElement || this.isValidPage()) || this.mode !== 'editing') return;
        if (!this.modelInput || !this.endpointInput || !this.apiKeyInput || !this.apiSpecInput) return;
        
        if (this.currentModel && this.models.length > 0) {
            const currentModelDetails = this.getModel(this.currentModel);
            
            if (currentModelDetails) {
                this.apiSpecInput.value = currentModelDetails.apiSpec || 'openai';
                this.modelInput.value = currentModelDetails.name || '';
                this.endpointInput.value = currentModelDetails.endpoint || '';
                this.apiKeyInput.value = currentModelDetails.apiKey || '';
                if (this.azureApiVersionInput) {
                    this.azureApiVersionInput.value = currentModelDetails.apiVersion || '';
                }
                this.handleAPIChange(); // Update UI based on API specification
            }
        }
    }
    
    /**
    * Saves the current model to the list of models and updates the storage.
    *
    * If a model with the same label exists, it updates that model.
    * Otherwise, it adds a new model to the list.
    */
    saveModel() {
        if (!(this.containerElement || this.isValidPage()) || this.mode !== 'editing') return;
        
        if (this.saveButton) {
            this.saveButton.disabled = true;
        }
        
        const newModel = {
            name: this.modelInput.value.trim(),
            endpoint: this.endpointInput.value.trim(),
            apiSpec: this.apiSpecInput.value.trim(),
            apiKey: this.apiKeyInput.value.trim()
        };
        
        if (this.azureApiVersionInput) {
            newModel.apiVersion = this.azureApiVersionInput.value.trim();
        }
        
        newModel.label = this.getModelLabel(newModel);
        
        const existingIndex = this.models.findIndex(m => m.label === newModel.label);
        
        if (existingIndex !== -1) {
            this.models[existingIndex] = newModel;
        } else {
            this.models.push(newModel);
        }
        
        this.currentModel = newModel.label; // Store only the model label
        this.saveModelsToStorage();
    }
    
    /**
    * Saves the current list of models to Chrome's sync storage.
    *
    * If the save is successful, it calls the provided success callback. If an
    * error occurs during saving, it logs the error and dispatches an error
    * event. After saving (successful or not), it enables the save button.
    *
    * @param {Function} successCallback - Function to be called if the save is
    * successful
    */
    saveModelsToStorage(successCallback = null) {
        if (this.saveButton) {
            this.saveButton.disabled = true;
        }
        
        chrome.storage.sync.set({
            models: this.models,
            currentModel: this.currentModel
        }, () => {
            let evt;
            
            if (chrome.runtime.lastError) {
                console.error('Error saving model:', chrome.runtime.lastError);
                evt = new CustomEvent('llmSavingError', { detail: { error: chrome.runtime.lastError.message } });
                if (this.llmStatus) {
                    this.llmStatus.textContent = `Error saving model: ${chrome.runtime.lastError.message}`;
                    this.llmStatus.classList.remove('hide');
                }
            } else {
                console.log('Model saved');
                evt = new CustomEvent('llmSaved');
                if (this.llmStatus) {
                    this.llmStatus.textContent = 'Model saved successfully.';
                    this.llmStatus.classList.remove('hide');
                }
                if (successCallback) {
                    successCallback();
                }
            }
            
            document.dispatchEvent(evt);
            if (this.saveButton) {
                this.saveButton.disabled = false;
            }
        });
    }
    
    /**
    * Deletes the specified model from the list of models and updates the storage.
    * After deleting, it updates the dropdown menu and filters the models.
    * @param {string} modelLabel - The label of the model to be deleted.
    */
    deleteModel(modelLabel) {
        if (!(this.containerElement || this.isValidPage())) return;
        
        this.models = this.models.filter(model => model.label !== modelLabel);
        
        // If the deleted model was the current model, clear currentModel
        if (this.currentModel && this.currentModel === modelLabel) {
            // Find the closest model in the model list
            if (this.models.length > 0) {
                this.currentModel = this.models[0].label;
            } else {
                this.currentModel = null;
            }
        }
        
        this.saveModelsToStorage(() => {
            this.updateDropdownMenu();
            this.filterModels();
        });
    }
    
    /**
    * Retrieves a model by label or returns the current model if no label is
    * provided.
    * @param {string|null} modelLabel - The label of the model to retrieve or null.
    * @returns {Object|null} The found model or null if not found.
    */
    getModel(modelLabel = null) {
        if (modelLabel === null) {
            modelLabel = this.currentModel;
        }
        
        return this.models.find(m => m.label === modelLabel) || null;
    }
    
    /**
    * Generates a unique label for a given model by combining its endpoint and name.
    * @param {Object} model - The model object.
    * @returns {string} The unique label for the model.
    */
    getModelLabel(model) {
        return `${model.endpoint}|${model.name}`;
    }
    
    /**
    * Selects the specified model and updates the form fields accordingly. This
    * method is called when a user clicks on a model in the dropdown menu.
    * @param {string} modelLabel - The label of the model to be selected.
    */
    selectModel(modelLabel) {
        if (!(this.containerElement || this.isValidPage())) return;
        const model = this.getModel(modelLabel);
        if (!model) return;
        
        this.currentModel = modelLabel; // Assign only the label
        
        if (this.mode === 'editing') {
            // Update UI fields with selected model data
            this.loadFields();
        } else if (this.mode === 'selection') {
            // Store the selected model in storage
            chrome.storage.sync.set({ currentModel: this.currentModel }, () => {
                console.log('Model selected:', this.currentModel);
            });
        }
        
        this.hideDropdown();
        this.updateDropdownMenu(); // Refresh dropdown to show updated model list
        this.updateSearchInput(); // Refresh search input to show updated selected model
    }
    
    /**
    * Shows the dropdown menu by updating its contents and setting its display
    * to 'block'. This method is called when the search input receives focus.
    */
    showDropdown() {
        if (!(this.containerElement || this.isValidPage())) return;
        this.updateDropdownMenu(); // Ensure the dropdown content is up-to-date
        this.dropdownMenu.style.display = 'block';
    }
    
    /**
    * Hides the dropdown menu by setting its display property to 'none'. This
    * is typically called when clicking outside the dropdown or after selecting
    * a model.
    */
    hideDropdown() {
        if (!(this.containerElement || this.isValidPage())) return;
        this.dropdownMenu.style.display = 'none';
    }
    
    /**
    * Updates the dropdown menu with available models, grouped by their
    * endpoint. This method creates the HTML structure for the dropdown,
    * including headers for each endpoint and individual model entries with
    * selection indicators and delete buttons.
    */
    updateDropdownMenu() {
        if (!(this.containerElement || this.isValidPage())) return;
        this.dropdownMenu.innerHTML = ''; // Clear existing content
        
        // Check if there are no models
        if (this.models.length === 0) {
            this.hideDropdown();
            return;
        }
        
        const groupedModels = this.groupModelsByEndpoint();
        
        for (const [endpoint, models] of Object.entries(groupedModels)) {
            let group = document.createElement('li');
            let api = models[0].apiSpec || this.defaultAPISpec;
            group.innerHTML = `<h6 class="dropdown-header">${endpoint} (${api})</h6>`;
            this.dropdownMenu.appendChild(group);
            
            models.forEach((model) => {
                // Determine the display name for the model
                let model_name = (models.length == 1 && !model.name) ? "endpoint default" : model.name || 'Unnamed model';
                const item = document.createElement('li');
                
                let checkIconDisplay = this.currentModel && model.label === this.currentModel ? 'inline-block' : 'none';
                
                item.innerHTML = `
                    <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" data-model-label="${model.label}">
                        <span>
                            <i class="bi bi-check text-success me-2" style="display: ${checkIconDisplay}"></i>
                            ${model_name}
                        </span>
                        ${this.mode === 'editing' ? '<i class="bi bi-x-circle text-danger delete-model hide showOnHover"></i>' : ''}
                    </a>
                `;
                this.dropdownMenu.appendChild(item);
            });
        }
    }
    
    /**
    * Groups the models by their endpoint. This helps in organizing the
    * dropdown menu by grouping models with the same endpoint together.
    * @returns {Object} An object where keys are endpoints and values are arrays of models.
    */
    groupModelsByEndpoint() {
        return this.models.reduce((groups, model) => {
            const endpoint = model.endpoint || 'No Endpoint';
            if (!groups[endpoint]) {
                groups[endpoint] = [];
            }
            groups[endpoint].push(model);
            return groups;
        }, {});
    }
    
    /**
    * Filters the models displayed in the dropdown menu based on the search term.
    * This method is called every time the user types in the search input, providing real-time filtering.
    */
    filterModels() {
        if (!(this.containerElement || this.isValidPage())) return;
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const items = this.dropdownMenu.querySelectorAll('.dropdown-item');
        const headers = this.dropdownMenu.querySelectorAll('.dropdown-header');
        
        items.forEach(item => {
            const modelLabel = item.dataset.modelLabel;
            const model = this.getModel(modelLabel);
            if (model) {
                // Check if the model name or endpoint matches the search term
                const matchesSearch = model.name.toLowerCase().includes(searchTerm) || 
                model.endpoint.toLowerCase().includes(searchTerm);
                
                item.style.display = matchesSearch ? '' : 'none';
            }
        });
        
        // Hide headers that have no visible items
        headers.forEach(header => {
            let nextElement = header.nextElementSibling;
            let hasVisibleItems = false;
            while (nextElement && !nextElement.matches('.dropdown-header')) {
                if (nextElement.style.display !== 'none') {
                    hasVisibleItems = true;
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }
            header.style.display = hasVisibleItems ? '' : 'none';
        });
    }
    
    /**
    * Updates the search input with the current model's name. This method is
    * typically called after loading a model or changing the current model.
    */
    updateSearchInput() {
        if (!(this.containerElement || this.isValidPage()) || !this.searchInput) return;
        if (this.currentModel) {
            const currentModelDetails = this.getModel();
            this.searchInput.value = currentModelDetails.name || '';
        } else {
            this.searchInput.value = '';
        }
    }
    
    /**
    * Handles changes to the API specification input field. Toggles visibility
    * of Azure-specific fields and updates labels based on the selected API.
    * This method ensures that the UI is appropriate for the chosen API specification.
    */
    handleAPIChange() {
        if (!(this.containerElement || this.isValidPage()) || this.mode !== 'editing') return;
        if (!this.apiSpecInput || !this.modelInput) return;
        if (this.apiSpecInput.value === 'openai') {
            if (this.azureApiVersionDiv) {
                this.azureApiVersionDiv.classList.add('d-none');
            }
            if (this.modelInputLabel) {
                this.modelInputLabel.textContent = 'Model';
            }
        } else {
            if (this.azureApiVersionDiv) {
                this.azureApiVersionDiv.classList.remove('d-none');
            }
            if (this.modelInputLabel) {
                this.modelInputLabel.textContent = 'Deployment ID';
            }
        }
    }
    
    /**
    * Hides the dropdown menu when the user clicks outside of the search input
    * or the dropdown menu. This helps in maintaining a clean UI when the user
    * is not interacting with the model selection.
    * @param {Event} event - The click event that triggered this function.
    */
    handleClickOutside(event) {
        if (!(this.containerElement || this.isValidPage())) return;
        if (!this.searchInput.contains(event.target) && !this.dropdownMenu.contains(event.target)) {
            this.hideDropdown();
        }
    }
    
    /**
    * Handles click events on dropdown items in the model dropdown menu. This
    * method determines whether the click was on a delete button or a model
    * selection, and calls the appropriate method to handle the action.
    * @param {Event} event - The click event object.
    */
    onDropdownItemClick(event) {
        if (!(this.containerElement || this.isValidPage())) return;
        const model_item = event.target.closest('.dropdown-item');
        
        if (event.target.classList.contains('delete-model')) {
            event.preventDefault();
            event.stopPropagation();
            const modelLabel = model_item.dataset.modelLabel;
            this.deleteModel(modelLabel);
        } else {
            if (model_item) {
                const modelLabel = model_item.dataset.modelLabel;
                this.selectModel(modelLabel);
            }
        }
    }
}
