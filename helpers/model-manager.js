// model-manager.js

/**
 * Manages LLM (Language Learning Model) configurations for the Chrome extension.
 * This class handles various operations related to models, including:
 * - Selection and display of models in a dropdown menu
 * - Saving and deleting model configurations
 * - Updating UI elements based on selected models
 * - Handling user interactions with the model management interface
 */
class ModelManager {
    /**
     * Initializes the ModelManager.
     * Sets up DOM element references, initializes model-related variables,
     * and triggers the initialization process.
     */
    constructor() {
        // DOM element references
        this.apiSpecInput = null;
        this.searchInput = null;
        this.dropdownMenu = null;
        this.modelInput = null;
        this.endpointInput = null;
        this.apiKeyInput = null;
        this.saveButton = null;

        // Default values and state variables
        this.defaultAPISpec = 'openai';
        this.models = []; // Array to store all available models
        this.currentModel = null; // Keep currentModel instead of currentModelLabel
    }

    /**
     * Initializes the ModelManager by performing the following steps:
     * 1. Loads saved models from storage
     * 2. Loads fields for the current model (if any)
     * 3. Sets up event listeners for user interactions
     * 4. Updates the search input and dropdown menu UI
     * @returns {Promise<void>}
     */
    async init() {
        const result = await chrome.storage.sync.get(['models', 'currentModel']);
        this.models = result.models || [];
        this.currentModel = result.currentModel || null;

        if (this.isValidPage()) {
            this.initializeDOMReferences();
            this.initializeEventListeners();
            this.initializeModels();
            this.loadFields();
            this.updateSearchInput();
            this.updateDropdownMenu();
        }
    }

    /**
     * Checks if the current page is the options page or the popup page.
     * @returns {boolean} True if the current page is the options page or the popup page, false otherwise.
     */
    isValidPage() {
        return location.pathname.includes('options.html') || location.pathname.includes('popup.html');
    }

    /**
     * Initializes DOM element references for the options page.
     */
    initializeDOMReferences() {
        this.apiSpecInput = document.getElementById('api-specification');
        this.searchInput = document.getElementById('model-search');
        this.dropdownMenu = document.getElementById('model-dropdown-menu');
        this.modelInput = document.getElementById('model-input');
        this.endpointInput = document.getElementById('endpoint-input');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveButton = document.getElementById('save-llm-button');
    }

    /**
     * Sets up event listeners for various UI elements to handle user
     * interactions. This includes listeners for the search input, dropdown
     * menu, save button, and API specification changes.
     */
    initializeEventListeners() {
        if (!this.isValidPage()) return;
        this.searchInput.addEventListener('focus', () => this.showDropdown());
        this.searchInput.addEventListener('input', () => this.filterModels());
        this.dropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        this.saveButton.addEventListener('click', () => this.saveModel());
        this.apiSpecInput.addEventListener('change', () => this.handleAPIChange());
        document.addEventListener('click', (event) => this.handleClickOutside(event));
    }

    /**
     * Saves the current model to the list of models and updates the storage. 
     *
     * If a model with the same name and endpoint exists, it updates that model.
     * Otherwise, it adds a new model to the list.
     */
    saveModel() {
        if (!this.isValidPage()) return;

        this.saveButton.disabled = true;

        const newModel = {
            name: this.modelInput.value.trim(),
            endpoint: this.endpointInput.value.trim(),
            apiSpec: this.apiSpecInput.value.trim(),
            apiKey: this.apiKeyInput.value.trim()
        };
        
        newModel.label = this.getModelLabel(newModel);
        
        const existingIndex = this.models.findIndex(m => m.label === newModel.label);
        
        if (existingIndex !== -1) {
            this.models[existingIndex] = newModel;
        } else {
            this.models.push(newModel);
        }
        
        this.currentModel = newModel; // Update currentModel
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
        this.saveButton.disabled = true;
        
        chrome.storage.sync.set({
            models: this.models,
            currentModel: this.currentModel
        }, () => {
            let evt;
            
            if (chrome.runtime.lastError) {
                console.error('Error saving model:', chrome.runtime.lastError);
                evt = new CustomEvent('llmSavingError', { detail: { error: chrome.runtime.lastError.message } });
            } else {
                console.log('Model saved');
                evt = new CustomEvent('llmSaved');
                if (successCallback) {
                    successCallback();
                }
            }

            document.dispatchEvent(evt);
            this.saveButton.disabled = false;
        });
    }
    
    /**
     * Deletes the specified model from the list of models and updates the
     * storage. After deleting, it updates the dropdown menu and filters the
     * models.
     * @param {string} modelLabel - The label of the model to be deleted.
     */
    deleteModel(modelLabel) {
        if (!this.isValidPage()) return;
        
        this.models = this.models.filter(model => model.label !== modelLabel);

        this.saveModelsToStorage(() => {
            this.updateDropdownMenu();
            this.filterModels();
        });
    }

    /**
     * Loads saved fields for the current model. If a current model exists,
     * populates the UI fields with its data.
     */
    loadFields() {
        if (!this.isValidPage()) return;

        if (this.currentModel && this.models.length > 0) {
            const currentModelDetails = this.models.find(model => 
                model.label === this.currentModel.label
            );
            
            if (currentModelDetails) {
                this.apiSpecInput.value = currentModelDetails.apiSpec || 'openai';
                this.modelInput.value = currentModelDetails.name || '';
                this.endpointInput.value = currentModelDetails.endpoint || '';
                this.apiKeyInput.value = currentModelDetails.apiKey || '';
                document.getElementById('azure-api-version').value = currentModelDetails.apiVersion || '';
                this.handleAPIChange(); // Update UI based on API specification
            }
        }
    }

    /**
     * Retrieves a model by label or returns the current model if no label is
     * provided.
     * @param {string|null} modelLabel - The label of the model to retrieve or null.
     * @returns {Object|null} The found model or null if not found.
     */
    getModel(modelLabel = null) {
        if (modelLabel === null) {
            return this.currentModel;
        }
        // Find and return the model with the matching label
        return this.models.find(m => m.label === modelLabel) || null;
    }
    
    /**
     * Shows the dropdown menu by updating its contents and setting its display
     * to 'block'. This method is called when the search input receives focus.
     */
    showDropdown() {
        if (!this.isValidPage()) return;
        this.updateDropdownMenu(); // Ensure the dropdown content is up-to-date
        this.dropdownMenu.style.display = 'block';
    }
    
    /**
     * Hides the dropdown menu by setting its display property to 'none'. This
     * is typically called when clicking outside the dropdown or after selecting
     * a model.
     */
    hideDropdown() {
        if (!this.isValidPage()) return;
        this.dropdownMenu.style.display = 'none';
    }
    
    /**
     * Updates the dropdown menu with available models, grouped by their
     * endpoint. This method creates the HTML structure for the dropdown,
     * including headers for each endpoint and individual model entries with
     * selection indicators and delete buttons.
     */
    updateDropdownMenu() {
        if (!this.isValidPage()) return;
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
                
                let checkIconDisplay = this.currentModel && model.label === this.currentModel.label ? 'inline-block' : 'none';

                item.innerHTML = `
                    <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" data-model-label="${model.label}">
                        <span>
                            <i class="bi bi-check text-success me-2" style="display: ${checkIconDisplay}"></i>
                            ${model_name}
                        </span>
                        <i class="bi bi-x-circle text-danger delete-model hide showOnHover"></i>
                    </a>
                `;
                this.dropdownMenu.appendChild(item);
            });
        }
    }
    
    /**
     * Groups the models by their endpoint. This helps in organizing the
     * dropdown menu by grouping models with the same endpoint together.
     * @returns {Object} An object where keys are endpoints and values are
     * arrays of models.
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
     * Filters the models displayed in the dropdown menu based on the search
     * term. This method is called every time the user types in the search
     * input, providing real-time filtering.
     */
    filterModels() {
        if (!this.isValidPage()) return;
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
                
                // TODO: Implement logic to show/hide headers based on visible items
                if (matchesSearch) {
                    const header = item.previousElementSibling;
                    // Add logic here to show the header if it's hidden
                }
            }
        });
    }
    
    /**
     * Handles click events on dropdown items in the model dropdown menu. This
     * method determines whether the click was on a delete button or a model
     * selection, and calls the appropriate method to handle the action.
     * @param {Event} event - The click event object.
     */
    onDropdownItemClick(event) {
        if (!this.isValidPage()) return;
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
    
    /**
     * Selects the specified model and updates the form fields accordingly. This
     * method is called when a user clicks on a model in the dropdown menu.
     * @param {string} modelLabel - The label of the model to be selected.
     */
    selectModel(modelLabel) {
        if (!this.isValidPage()) return;
        const model = this.getModel(modelLabel);
        if (!model) return;

        this.currentModel = model;
        // Update UI fields with selected model data
        this.searchInput.value = model.name;
        this.modelInput.value = model.name;
        this.endpointInput.value = model.endpoint;
        this.apiKeyInput.value = model.apiKey;
        this.apiSpecInput.value = model.apiSpec || this.defaultAPISpec;
        this.handleAPIChange();
        this.hideDropdown();
        this.updateDropdownMenu(); // Refresh dropdown to show updated selection
    }
    
    
    
    /**
     * Hides the dropdown menu when the user clicks outside of the search input
     * or the dropdown menu. This helps in maintaining a clean UI when the user
     * is not interacting with the model selection.
     * @param {Event} event - The click event that triggered this function.
     */
    handleClickOutside(event) {
        if (!this.isValidPage()) return;
        if (!this.searchInput.contains(event.target) && !this.dropdownMenu.contains(event.target)) {
            this.hideDropdown();
        }
    }
    
    /**
     * Handles changes to the API specification input field. Toggles visibility
     * of Azure-specific fields and updates labels based on the selected API.
     * This method ensures that the UI is appropriate for the chosen API
     * specification.
     */
    handleAPIChange() {
        if (!this.isValidPage()) return;
        let azureFields = document.getElementById('azure-fields')
        let modelInputLabel = document.getElementById('model_input_label')
        let apiVersionInput = document.getElementById('azure-api-version-div')
        if (this.apiSpecInput.value === 'openai') {
            apiVersionInput.classList.add('d-none');
            modelInputLabel.textContent = 'Model';
        } else {
            apiVersionInput.classList.remove('d-none');
            modelInputLabel.textContent = 'Deployment ID';
        }
        // TODO: Consider adding more API-specific UI adjustments here
    }
    
    /**
     * Updates the search input with the current model's name. This method is
     * typically called after loading a model or changing the current model.
     */
    updateSearchInput() {
        if (!this.isValidPage() || !this.searchInput) return;
        if (this.currentModel) {
            this.searchInput.value = this.currentModel.name || '';
        }
    }

    /**
     * Generates a unique label for a given model by combining its endpoint and name.
     * @param {Object} model - The model object.
     * @returns {string} The unique label for the model.
     */
    getModelLabel(model) {
        return `${model.endpoint}|${model.name}`;
    }

    initializeModels() {
        this.models = this.models.map(model => {
            if (!model.label) {
                model.label = this.getModelLabel(model);
            }
            return model;
        });
    }
}