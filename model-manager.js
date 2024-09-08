// model-manager.js

class ModelManager {
    constructor() {
        this.apiSpecInput = document.getElementById('api-specification');
        this.searchInput = document.getElementById('model-search');
        this.dropdownMenu = document.getElementById('model-dropdown-menu');
        this.modelInput = document.getElementById('model-input');
        this.endpointInput = document.getElementById('endpoint-input');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveButton = document.getElementById('save-llm-button');
        this.defaultAPISpec = 'openai';
        this.models = [];
        
        this.initializeEventListeners();
        this.loadModels();
        this.updateSearchInput(); // Add this line
    }
    
    /**
     * Initializes the event listeners for the ModelManager class.
     * - Adds a focus event listener to the searchInput that calls the
     *   showDropdown method.
     * - Adds an input event listener to the searchInput that calls the
     *   filterModels method.
     * - Adds a click event listener to the dropdownMenu that calls the
     *   onDropdownItemClick method.
     * - Adds a click event listener to the saveButton that calls the saveModel
     *   method.
     * - Adds a change event listener to the apiSpecInput that calls the
     *   handleAPIChange method.
     * - Adds a click event listener to the document that calls the
     *   handleClickOutside method.
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
    * Loads the models from the browser's sync storage and assigns them to the
    * `models` property. This method is called during the initialization of the
    * `ModelManager` class.
    */
    loadModels() {
        chrome.storage.sync.get(['models'], (result) => {
            this.models = result.models || [];
        });
    }
    
    /**
    * Shows the dropdown menu by updating its contents and setting its display
    * to 'block'. This method is called when the search input receives focus,
    * allowing the user to select a model from the dropdown.
    */
    showDropdown() {
        this.updateDropdownMenu();
        this.dropdownMenu.style.display = 'block';
    }
    
    /**
    * Hides the dropdown menu by setting its display property to 'none'. This
    * method is called when the user clicks outside of the dropdown menu,
    * causing it to be hidden.
    */
    hideDropdown() {
        this.dropdownMenu.style.display = 'none';
    }
    
    /**
     * Updates the dropdown menu with the available models, grouped by their
     * endpoint. Each group is displayed with a header showing the endpoint and
     * the associated API specification. The models within each group are
     * displayed as clickable items in the dropdown menu. A delete icon is also
     * displayed for each model, allowing the user to delete the model.
     */
    updateDropdownMenu() {
        this.dropdownMenu.innerHTML = '';
        const groupedModels = this.groupModelsByEndpoint();
        
        for (const [endpoint, models] of Object.entries(groupedModels)) {
            let group = document.createElement('li');
            let api = models[0].apiSpec || this.defaultAPISpec;
            group.innerHTML = `<h6 class="dropdown-header">${endpoint} (${api})</h6>`;
            this.dropdownMenu.appendChild(group);
            
            models.forEach((model) => {
                let model_name = (models.length == 1 && !model.name) ? "endpoint default" : model.name || 'Unnamed model';
                
                const item = document.createElement('li');
                item.innerHTML = `
                    <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" data-model='${JSON.stringify(model)}'>
                        <span>
                            <i class="bi bi-check-circle-fill text-success me-2" style="display: none;"></i>
                            ${model_name}
                        </span>
                        <i class="bi bi-x-circle text-danger delete-model hide showOnHover"></i>
                    </a>
                `;
                this.dropdownMenu.appendChild(item);
            });
        }
        this.updateCurrentModelCheckmark();
    }
    
    /**
     * Groups the models by their endpoint.
     * @returns {Object} An object where the keys are the endpoints and the
     * values are arrays of models for that endpoint.
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
     * term entered in the search input. Hides any models that do not match the
     * search term, and shows the corresponding dropdown header if at least one
     * model in that group matches the search.
     */
    filterModels() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const items = this.dropdownMenu.querySelectorAll('.dropdown-item');
        const headers = this.dropdownMenu.querySelectorAll('.dropdown-header');
        
        // headers.forEach(header => header.style.display = 'none');
        
        items.forEach(item => {
            const model = JSON.parse(item.dataset.model);
            const matchesSearch = model.name.toLowerCase().includes(searchTerm) || 
            model.endpoint.toLowerCase().includes(searchTerm);
            
            item.style.display = matchesSearch ? '' : 'none';
            
            if (matchesSearch) {
                const header = item.previousElementSibling;
                // if (header && header.classList.contains('dropdown-header')) {
                //     header.style.display = '';
                // }
            }
        });
    }
    
    /**
     * Handles the click event on a dropdown item in the model dropdown menu. If
     * the clicked element has the 'delete-model' class, it deletes the
     * corresponding model. Otherwise, it selects the corresponding model and
     * updates the form fields.
     * @param {Event} event - The click event object.
     */
    onDropdownItemClick(event) {
        const model_item = event.target.closest('.dropdown-item');

        if (event.target.classList.contains('delete-model')) {
            event.preventDefault();
            event.stopPropagation();
            const model = JSON.parse(model_item.dataset.model);
            this.deleteModel(model);
        } else {

            if (model_item) {
                const model = JSON.parse(model_item.dataset.model);
                this.selectModel(model);
            }
        }
    }
    
    /**
     * Selects the specified model and updates the form fields accordingly.
     * @param {Object} model - The model object to be selected.
     */
    selectModel(model) {
        this.searchInput.value = model.name;
        this.modelInput.value = model.name;
        this.endpointInput.value = model.endpoint;
        this.apiKeyInput.value = model.apiKey;
        this.apiSpecInput.value = model.apiSpec || this.defaultAPISpec;
        this.handleAPIChange()
        this.hideDropdown();
        this.updateCurrentModelCheckmark();
    }
    
     /**
     * Saves the current model to the list of models and updates the storage. If
     * a model with the same name and endpoint already exists, it updates that
     * model. Otherwise, it adds a new model to the list. After saving, it
     * updates the chrome.storage.sync with the new list of models.
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
        
        chrome.storage.sync.set({ models: this.models }, () => {
            console.log('Model saved');
        });
    }
    
    
    /**
     * Deletes the specified model from the list of models and updates the
     * chrome.storage.sync. After deleting the model, it updates the dropdown
     * menu and filters the models.
     * @param {Object} modelToDelete - The model object to be deleted.
     */
    deleteModel(modelToDelete) {
        this.models = this.models.filter(model => 
            !(model.name === modelToDelete.name && model.endpoint === modelToDelete.endpoint)
        );

        chrome.storage.sync.set({ models: this.models }, () => {
            console.log('Model deleted');
            this.updateDropdownMenu();
            this.filterModels();
        });
    }
    
    /**
     * Hides the dropdown menu when the user clicks outside of the search input or the dropdown menu.
     * @param {Event} event - The click event that triggered this function.
     */
    handleClickOutside(event) {
        if (!this.searchInput.contains(event.target) && !this.dropdownMenu.contains(event.target)) {
            this.hideDropdown();
        }
    }
    
    /**
     * Handles changes to the API specification input field.
     * Toggles the visibility of the Azure API version input field and updates the label for the model input field based on the selected API specification.
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
    }
    
    loadFields() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(['currentModel'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    if (result.currentModel) {
                        this.apiSpecInput.value = result.currentModel.apiSpecification || 'openai';
                        this.modelInput.value = result.currentModel.name || '';
                        this.endpointInput.value = result.currentModel.endpoint || '';
                        this.apiKeyInput.value = result.currentModel.apiKey || '';
                        document.getElementById('azure-api-version').value = result.currentModel.apiVersion || '';
                        this.handleAPIChange();
                        this.updateSearchInput(); // Add this line
                    }
                    resolve();
                }
            });
        });
    }

    saveModelData() {
        let currentModel = {
            apiSpecification: this.apiSpecInput.value,
            name: this.modelInput.value.trim(),
            endpoint: this.endpointInput.value.trim(),
            apiKey: this.apiKeyInput.value.trim()
        };
        
        if (this.apiSpecInput.value === 'azure') {
            currentModel.apiVersion = document.getElementById('azure-api-version').value.trim();
        }

        return new Promise((resolve, reject) => {
            chrome.storage.sync.set({ currentModel }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    this.saveModel();
                    this.updateSearchInput(); // Add this line
                    this.updateCurrentModelCheckmark(); // Add this line
                    resolve();
                }
            });
        });
    }
    
    // Add this new method
    updateSearchInput() {
        chrome.storage.sync.get(['currentModel'], (result) => {
            if (result.currentModel && this.searchInput) {
                this.searchInput.value = result.currentModel.name || '';
            }
        });
    }

    // Add this new method
    updateCurrentModelCheckmark() {
        chrome.storage.sync.get(['currentModel'], (result) => {
            if (result.currentModel) {
                const items = this.dropdownMenu.querySelectorAll('.dropdown-item');
                items.forEach(item => {
                    const model = JSON.parse(item.dataset.model);
                    const checkmark = item.querySelector('.bi-check-circle-fill');
                    if (model.name === result.currentModel.name && model.endpoint === result.currentModel.endpoint) {
                        checkmark.style.display = 'inline-block';
                    } else {
                        checkmark.style.display = 'none';
                    }
                });
            }
        });
    }
}