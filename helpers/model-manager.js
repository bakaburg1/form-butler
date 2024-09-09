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
        this.apiSpecInput = document.getElementById('api-specification');
        this.searchInput = document.getElementById('model-search');
        this.dropdownMenu = document.getElementById('model-dropdown-menu');
        this.modelInput = document.getElementById('model-input');
        this.endpointInput = document.getElementById('endpoint-input');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveButton = document.getElementById('save-llm-button');

        // Default values and state variables
        this.defaultAPISpec = 'openai';
        this.models = []; // Array to store all available models
        this.currentModel = null; // Currently selected model

        // Start the initialization process
        this.init();
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
        await this.loadModels();
        await this.loadFields();
        this.initializeEventListeners();
        this.updateSearchInput();
        this.updateDropdownMenu();
    }

    /**
     * Loads saved models from Chrome's sync storage.
     * If no models are found, initializes with an empty array.
     * @returns {Promise<void>}
     */
    async loadModels() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['models'], (result) => {
                this.models = result.models || [];
                resolve();
            });
        });
    }

    /**
     * Loads saved fields for the current model from Chrome's sync storage. If a
     * current model exists, populates the UI fields with its data.
     * @returns {Promise<void>}
     */
    async loadFields() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['currentModel'], (result) => {
                if (result.currentModel) {
                    this.currentModel = result.currentModel;
                    // Populate UI fields with current model data
                    this.apiSpecInput.value = this.currentModel.apiSpecification || 'openai';
                    this.modelInput.value = this.currentModel.name || '';
                    this.endpointInput.value = this.currentModel.endpoint || '';
                    this.apiKeyInput.value = this.currentModel.apiKey || '';
                    document.getElementById('azure-api-version').value = this.currentModel.apiVersion || '';
                    this.handleAPIChange(); // Update UI based on API specification
                }
                resolve();
            });
        });
    }

    /**
     * Retrieves a model by name or returns the current model if no name is
     * provided.
     * @param {string} [name] - The name of the model to retrieve.
     * @returns {Object|null} The found model or null if not found.
     */
    getModel(name) {
        if (!name) {
            return this.currentModel;
        }
        // Find and return the model with the matching name
        return this.models.find(m => m.name === name) || null;
    }

    /**
     * Sets up event listeners for various UI elements to handle user
     * interactions. This includes listeners for the search input, dropdown
     * menu, save button, and API specification changes.
     */
    initializeEventListeners() {
        this.searchInput.addEventListener('focus', () => this.showDropdown());
        this.searchInput.addEventListener('input', () => this.filterModels());
        this.dropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        this.saveButton.addEventListener('click', () => this.saveModel());
        this.apiSpecInput.addEventListener('change', () => this.handleAPIChange());
        document.addEventListener('click', (event) => this.handleClickOutside(event));
    }
    
    /**
     * Shows the dropdown menu by updating its contents and setting its display
     * to 'block'. This method is called when the search input receives focus.
     */
    showDropdown() {
        this.updateDropdownMenu(); // Ensure the dropdown content is up-to-date
        this.dropdownMenu.style.display = 'block';
    }
    
    /**
     * Hides the dropdown menu by setting its display property to 'none'. This
     * is typically called when clicking outside the dropdown or after selecting
     * a model.
     */
    hideDropdown() {
        this.dropdownMenu.style.display = 'none';
    }
    
    /**
     * Updates the dropdown menu with available models, grouped by their
     * endpoint. This method creates the HTML structure for the dropdown,
     * including headers for each endpoint and individual model entries with
     * selection indicators and delete buttons.
     */
    updateDropdownMenu() {
        this.dropdownMenu.innerHTML = ''; // Clear existing content
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
                item.innerHTML = `
                    <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" data-model-name="${model.name}">
                        <span>
                            <i class="bi bi-check text-success me-2" style="display: ${this.currentModel && this.currentModel.name === model.name ? 'inline-block' : 'none'}"></i>
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
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const items = this.dropdownMenu.querySelectorAll('.dropdown-item');
        const headers = this.dropdownMenu.querySelectorAll('.dropdown-header');
        
        items.forEach(item => {
            const modelName = item.dataset.modelName;
            const model = this.getModel(modelName);
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
        const model_item = event.target.closest('.dropdown-item');

        if (event.target.classList.contains('delete-model')) {
            event.preventDefault();
            event.stopPropagation();
            const modelName = model_item.dataset.modelName;
            const model = this.getModel(modelName);
            if (model) {
                this.deleteModel(model);
            }
        } else {
            if (model_item) {
                const modelName = model_item.dataset.modelName;
                const model = this.getModel(modelName);
                if (model) {
                    this.selectModel(model);
                }
            }
        }
    }
    
    /**
     * Selects the specified model and updates the form fields accordingly. This
     * method is called when a user clicks on a model in the dropdown menu.
     * @param {Object} model - The model object to be selected.
     */
    selectModel(model) {
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
     * Saves the current model to the list of models and updates the storage. If
     * a model with the same name and endpoint exists, it updates that model.
     * Otherwise, it adds a new model to the list.
     */
    saveModel() {
        const newModel = {
            name: this.modelInput.value.trim(),
            endpoint: this.endpointInput.value.trim(),
            apiSpec: this.apiSpecInput.value.trim(),
            apiKey: this.apiKeyInput.value.trim()
        };
        
        // Check if the model already exists, and update it if it does
        const existingIndex = this.models.findIndex(m => m.name === newModel.name && m.endpoint === newModel.endpoint);
        if (existingIndex !== -1) {
            this.models[existingIndex] = newModel;
        } else {
            this.models.push(newModel);
        }
        
        // Save updated models list to Chrome storage
        chrome.storage.sync.set({ models: this.models }, () => {
            console.log('Model saved');
            // TODO: Consider adding user feedback for successful save
        });
    }
    
    /**
     * Deletes the specified model from the list of models and updates the
     * storage. After deleting, it updates the dropdown menu and filters the
     * models.
     * @param {Object} modelToDelete - The model object to be deleted.
     */
    deleteModel(modelToDelete) {
        this.models = this.models.filter(model => 
            !(model.name === modelToDelete.name && model.endpoint === modelToDelete.endpoint)
        );

        // Save updated models list to Chrome storage
        chrome.storage.sync.set({ models: this.models }, () => {
            console.log('Model deleted');
            this.updateDropdownMenu();
            this.filterModels();
            // TODO: Consider adding user feedback for successful deletion
        });
    }
    
    /**
     * Hides the dropdown menu when the user clicks outside of the search input
     * or the dropdown menu. This helps in maintaining a clean UI when the user
     * is not interacting with the model selection.
     * @param {Event} event - The click event that triggered this function.
     */
    handleClickOutside(event) {
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
        if (this.currentModel && this.searchInput) {
            this.searchInput.value = this.currentModel.name || '';
        }
    }
}