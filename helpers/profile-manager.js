/**
* ProfileManager class
*
* This class manages user profiles for a Chrome extension, handling profile
* creation, selection, deletion, and data persistence. It provides a user
* interface for profile management and form field population based on the
* selected profile.
*
* Key features:
* - Profile CRUD operations
* - Chrome storage synchronization
* - Dynamic form generation
* - Profile search and filtering
* - Default profile handling
*/
class ProfileManager {
    /**
    * Initialize the ProfileManager
    */
    constructor() {
        this.containerElement = null;
        this.mode = null;
        
        // Initialize properties to null or empty arrays
        this.currentProfile = null;
        this.profiles = [];
        
        // DOM element references
        this.profileForm = null;
        this.profileSearchInput = null;
        this.profileDropdownMenu = null;
        this.profileNameInput = null;
        this.addFieldButton = null;
        this.saveButton = null;
        this.profileStatus = null;
    }
    
    /**
    * Initialize the ProfileManager
    * @param {string} [containerElement="#profile-manager-container"] - The selector for the container element
    * @param {string} [mode='editing'] - The mode of operation ('editing' or 'selection')
    */
    async init(containerElement = "#profile-manager-container", mode = 'editing') {
        // Retrieve stored profiles and current profile from Chrome storage
        const result = await chrome.storage.sync.get(['profiles', 'currentProfile']);
        this.profiles = result.profiles || [];
        const currentProfile = result.currentProfile || 'Default';
        
        // Ensure there's at least a default profile
        if (this.profiles.length === 0) {
            this.profiles.push({ name: 'Default', info: this.getDefaultProfile() });
        }
        
        this.mode = mode;
        
        if (!this.isValidPage()) {
            this.currentProfile = currentProfile;
            console.log('Profile manager initialized in no-UI mode');
            return;
        }
        
        this.containerElement = document.querySelector(containerElement);
        
        if (!this.containerElement) {
            console.log('Profile manager container element not found');
            return;
        }
        
        this.initializeDOMReferences();
        this.initializeEventListeners();
        
        this.selectProfile(currentProfile);
        
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
        
        // Reference the elements
        this.profileForm = this.containerElement.querySelector('#profileForm');
        this.profileSearchInput = this.containerElement.querySelector('#profile-search');
        this.profileDropdownMenu = this.containerElement.querySelector('#profile-dropdown-menu');
        this.profileNameInput = this.containerElement.querySelector('#profile-name');
        this.addFieldButton = this.containerElement.querySelector('#add-field-button');
        this.saveButton = this.containerElement.querySelector('#save-profile-button');
        this.profileStatus = this.containerElement.querySelector('#profile-status');
    }
    
    /**
    * Generates the editing UI using the provided HTML structure and appends it to the container element.
    */
    createEditingUI() {
        const editingTemplate = `
            <form id="profile-form" class="options-form">
                <div class="dropdown form-group">
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <input type="text" id="profile-search" class="form-control" placeholder="Search profiles">
                    </div>
                    <ul class="dropdown-menu" id="profile-dropdown-menu">
                        <!-- Dropdown items will be dynamically populated here -->
                    </ul>
                </div>
                <div class="form-group">
                    <label for="profile-name" class="form-label">Profile Name</label>
                    <input type="text" id="profile-name" class="form-control" placeholder="Enter profile name">
                </div>
                <div id="profileForm">
                    <!-- Profile fields will be dynamically populated here -->
                </div>
                <div id="add-field-button" class="form-group">
                    <span class="add-field-label">
                        <i class="bi bi-plus-circle text-success add-field hide showOnHover"></i>
                        Add custom field
                    </span>
                </div>
                <button type="button" id="save-profile-button" class="btn btn-primary">Save Profile</button>
                <div id="profile-status" class="status-message mt-2"></div>
            </form>
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
                    <input type="text" id="profile-search" class="form-control" placeholder="Search profiles">
                </div>
                <ul class="dropdown-menu" id="profile-dropdown-menu">
                    <!-- Dropdown items will be dynamically populated here -->
                </ul>
            </div>
        `;
        this.containerElement.innerHTML = selectionTemplate;
    }
    
    /**
    * Sets up event listeners for various UI elements to handle user interactions.
    */
    initializeEventListeners() {
        if (!this.isValidPage()) return;
        
        this.profileSearchInput.addEventListener('focus', () => this.showDropdown());
        this.profileSearchInput.addEventListener('input', () => this.filterProfiles());
        this.profileDropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        document.addEventListener('click', (event) => this.handleClickOutside(event));
        
        if (this.mode === 'editing') {
            if (this.addFieldButton) {
                this.addFieldButton.addEventListener('click', () => this.addField());
            }
            if (this.saveButton) {
                this.saveButton.addEventListener('click', () => this.saveProfile());
            }
            if (this.profileForm) {
                // Add delegate event listener for deleting custom fields
                this.profileForm.addEventListener('click', (event) => {
                    const deleteButton = event.target.closest('.delete-custom-field');
                    if (deleteButton) {
                        const formGroup = deleteButton.closest('.form-group');
                        if (formGroup) {
                            formGroup.remove();
                        }
                    }
                });
            }
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
    * Load and display form fields based on the current profile
    */
    loadFields() {
        if (!this.isValidPage() || this.mode !== 'editing') return;
        if (!this.profileForm) return;
        
        // Clear existing form fields
        this.profileForm.innerHTML = '';
        if (this.profileNameInput) {
            this.profileNameInput.value = this.currentProfile;
        }
        
        // Get the current profile data

        const currentProfileData = this.getProfile(this.currentProfile);
        
        // Merge current profile with default profile to ensure all fields are present
        const mergedProfile = { ...this.getDefaultProfile(), ...currentProfileData.info };
        
        // Separate default fields and custom fields
        const defaultFields = [];
        const customFields = [];
        
        Object.values(mergedProfile).forEach(field => {
            if (field.isCustomField) {
                customFields.push(field);
            } else {
                defaultFields.push(field);
            }
        });
        
        // Sort and add default fields
        defaultFields
        .sort((a, b) => a.position - b.position)
        .forEach(field => {
            this.addField(field);
        });
        
        // Add custom fields at the end
        customFields
        .sort((a, b) => a.position - b.position)
        .forEach(field => {
            this.addField(field);
        });
        
        // Update UI components
        this.updateDropdownMenu();
        this.updateSearchInput();
    }
    
    /**
    * Save the current profile information
    */
    async saveProfile() {
        if (!this.profileForm) return;
        
        this.saveButton.disabled = true;
        
        // Get the profile name from the input field
        const profileName = this.profileNameInput.value.trim();
        if (!profileName) {
            throw new Error('Profile name cannot be empty');
        }
        
        // Collect updated info from form inputs
        const updatedInfo = {};
        const inputs = this.profileForm.querySelectorAll('input');
        
        inputs.forEach(input => {
            const label = input.previousElementSibling.querySelector('label');
            const isCustomField = label && label.classList.contains('custom-field');
            
            if (isCustomField || input.value.trim() !== '') {
                updatedInfo[input.id] = {
                    id: input.id,
                    label: label.textContent,
                    type: input.type,
                    value: input.value.trim(),
                    position: parseInt(input.dataset.position) || 0,
                    isCustomField: isCustomField
                };
            }
        });
        
        // Search for the edited profile
        const existingProfileIndex = this.profiles.findIndex(p => p.name === profileName);
        
        if (existingProfileIndex !== -1) {
            // Update existing profile
            this.profiles[existingProfileIndex] = { name: profileName, info: updatedInfo };
        } else {
            // Create new profile
            this.profiles.push({ name: profileName, info: updatedInfo });
        }
        this.currentProfile = profileName;
        
        // Save profiles and update UI
        this.saveProfilesToStorage();
    }
    
    saveProfilesToStorage(successCallback = null) {
        if (this.saveButton) {
            this.saveButton.disabled = true;
        }
        
        chrome.storage.sync.set({
            profiles: this.profiles,
            currentProfile: this.currentProfile
        }, () => {
            let evt;
            
            if (chrome.runtime.lastError) {
                console.error('Error saving profile:', chrome.runtime.lastError);
                evt = new CustomEvent('profileSavingError', { detail: { error: chrome.runtime.lastError.message } });
                if (this.profileStatus) {
                    this.profileStatus.textContent = `Error saving profile: ${chrome.runtime.lastError.message}`;
                    this.profileStatus.classList.remove('hide');
                }
            } else {
                console.log('Profile saved');
                evt = new CustomEvent('profileSaved');
                if (this.profileStatus) {
                    this.profileStatus.textContent = 'Profile saved successfully.';
                    this.profileStatus.classList.remove('hide');
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
    * Delete a profile and update the UI
    * @param {Object} profileToDelete - The profile to delete
    */
    async deleteProfile(profileToDelete) {
        if (!this.isValidPage()) return;
        
        this.profiles = this.profiles.filter(
            profile => profile.name !== profileToDelete
        );
        
        // Use the default profile if there are no profiles left
        if (this.profiles.length === 0) {
            this.profiles.push({ name: 'Default', info: this.getDefaultProfile() });
        }
        
        // Select the first profile if the deleted one was the current one
        if (this.currentProfile === profileToDelete) {
            this.currentProfile = this.profiles[0].name;
        }
        
        // Save the updated profiles and update the UI
        this.saveProfilesToStorage(() => {
            if (this.mode === 'editing') {
                this.loadFields();
            }
            this.updateSearchInput();
        });
    }
    
    /**
    * Get the default profile structure
    * @returns {Object} An object containing default profile fields
    */
    getDefaultProfile() {
        // Define default profile fields with their properties
        return {
            firstName: { id: 'firstName', label: 'First Name', type: 'text', value: '', position: 1 },
            lastName: { id: 'lastName', label: 'Last Name', type: 'text', value: '', position: 2 },
            address: { id: 'address', label: 'Address', type: 'text', value: '', position: 3 },
            city: { id: 'city', label: 'City', type: 'text', value: '', position: 4 },
            region: { id: 'region', label: 'Region/State/Province', type: 'text', value: '', position: 5 },
            postalCode: { id: 'postalCode', label: 'Postal Code', type: 'text', value: '', position: 6 },
            country: { id: 'country', label: 'Country', type: 'text', value: '', position: 7 },
            email: { id: 'email', label: 'Email', type: 'email', value: '', position: 8 },
            phone: { id: 'phone', label: 'Phone', type: 'tel', value: '', position: 9 },
            phoneCountryCode: { id: 'phoneCountryCode', label: 'Phone Country Code', type: 'text', value: '', position: 10 },
            birthDate: { id: 'birthDate', label: 'Birth Date (dd-mm-yyyy)', type: 'date', value: '', position: 11, placeholder: 'YYYY-MM-DD' },
            age: { id: 'age', label: 'Age', type: 'number', value: '', position: 12 },
            nationality: { id: 'nationality', label: 'Nationality', type: 'text', value: '', position: 13 },
            title: { id: 'title', label: 'Title', type: 'text', value: '', position: 14 },
            companyInstitutionOrganizationName: { id: 'companyInstitutionOrganizationName', label: 'Company/Institution/Organization Name', type: 'text', value: '', position: 15 },
            companyInstitutionOrganizationAddress: { id: 'companyInstitutionOrganizationAddress', label: 'Company/Institution/Organization Address', type: 'text', value: '', position: 16 },
            companyInstitutionOrganizationCountry: { id: 'companyInstitutionOrganizationCountry', label: 'Company/Institution/Organization Country', type: 'text', value: '', position: 17 }
        };
    }
    
    /**
    * Get a profile by name
    * @param {string} name - The name of the profile to retrieve
    * @param {boolean} onlyWithValues - If true, return only fields with non-empty values
    * @returns {Object} The requested profile, or a default profile if not found
    */
    getProfile(name, onlyWithValues = false) {
        if (!name) {
            if (this.currentProfile) {
                return this.getProfile(this.currentProfile);
            } else {
                console.error('No profile passed and no current profile set.');
            }
        }
        
        // Define default profile
        const defaultProfile = {
            name: 'Default',
            info: this.getDefaultProfile()
        };
        
        // Find the requested profile
        const profile = this.profiles.find(p => p.name === name);
        if (!profile) {
            return onlyWithValues ? { name: 'Default', info: {} } : defaultProfile;
        }
        
        // Merge profile info with default profile
        let mergedInfo = { ...defaultProfile.info, ...profile.info };
        
        // Filter out empty fields if onlyWithValues is true
        if (onlyWithValues) {
            mergedInfo = Object.fromEntries(
                Object.entries(mergedInfo).filter(([, field]) => field.value !== '')
            );
        }
        
        // Sort fields by position
        const sortedInfo = Object.fromEntries(
            Object.entries(mergedInfo).sort(([, a], [, b]) => a.position - b.position)
        );
        
        return {
            name: profile.name,
            info: sortedInfo
        };
    }
    
    /**
    * Display the profile dropdown menu
    */
    showDropdown() {
        if (!this.isValidPage()) return;
        this.updateDropdownMenu();
        this.profileDropdownMenu.style.display = 'block';
    }
    
    /**
    * Hide the profile dropdown menu
    */
    hideDropdown() {
        if (!this.isValidPage()) return;
        this.profileDropdownMenu.style.display = 'none';
    }
    
    /**
    * Update the dropdown menu with current profiles
    */
    updateDropdownMenu() {
        if (!this.isValidPage()) return;
        this.profileDropdownMenu.innerHTML = '';
        this.profiles.forEach(profile => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item d-flex justify-content-between align-items-center';
            link.href = '#';
            link.dataset.profileName = profile.name;
            
            const nameSpan = document.createElement('span');
            
            // Add checkmark for current profile inside the nameSpan
            const checkmark = document.createElement('i');
            checkmark.className = 'bi bi-check text-success me-2';
            checkmark.style.display = profile.name === this.currentProfile ? 'inline-block' : 'none';
            
            nameSpan.appendChild(checkmark);
            nameSpan.appendChild(document.createTextNode(profile.name));
            
            let deleteIconHTML = '';
            if (this.mode === 'editing') {
                deleteIconHTML = '<i class="bi bi-x-circle text-danger delete-profile hide showOnHover"></i>';
            }
            
            link.innerHTML = `
                <span>
                    <i class="bi bi-check text-success me-2" style="display: ${profile.name === this.currentProfile ? 'inline-block' : 'none'}"></i>
                    ${profile.name}
                </span>
                ${deleteIconHTML}
            `;
            
            item.appendChild(link);
            this.profileDropdownMenu.appendChild(item);
        });
    }
    
    /**
    * Filter profiles in the dropdown based on search input
    */
    filterProfiles() {
        if (!this.isValidPage()) return;
        const searchTerm = this.profileSearchInput.value.toLowerCase().trim();
        const items = this.profileDropdownMenu.querySelectorAll('.dropdown-item');
        
        items.forEach(item => {
            const profileName = item.dataset.profileName;
            const matchesSearch = profileName.toLowerCase().includes(searchTerm);
            item.style.display = matchesSearch ? '' : 'none';
        });
    }
    
    /**
    * Handle clicks on dropdown menu items
    * @param {Event} event - The click event
    */
    onDropdownItemClick(event) {
        if (!this.isValidPage()) return;
        const profileItem = event.target.closest('.dropdown-item');
        
        if (event.target.classList.contains('delete-profile')) {
            event.preventDefault();
            event.stopPropagation();

            const profileName = profileItem.dataset.profileName;
            this.deleteProfile(profileName);

        } else if (profileItem) {

            const profileName = profileItem.dataset.profileName;
            this.selectProfile(profileName);
        }
    }
    
    /**
    * Select a profile and update the UI
    * @param {string} profileName - The name of the profile to select
    */
    selectProfile(profileName) {
        if (!this.isValidPage()) return;

        this.currentProfile = profileName;
        
        if (this.mode === 'editing') {
            this.loadFields();
        } else if (this.mode === 'selection') {
            // Store the selected profile in storage
            chrome.storage.sync.set({ currentProfile: this.currentProfile }, () => {
                console.log('Profile selected:', this.currentProfile);
            });
        }
        
        this.hideDropdown();
        this.updateDropdownMenu(); // Refresh dropdown to show updated profile list
        this.updateSearchInput(); // Refresh search input to show updated selected profile
    }
    
    /**
    * Handle clicks outside the dropdown to close it
    * @param {Event} event - The click event
    */
    handleClickOutside(event) {
        if (!this.isValidPage()) return;
        if (
            !this.profileSearchInput.contains(event.target) &&
            !this.profileDropdownMenu.contains(event.target)) {
                this.hideDropdown();
            }
        }
        
        /**
        * Update the search input with the current profile name
        */
        updateSearchInput() {
            if (!this.isValidPage()) return;
            if (this.currentProfile && this.profileSearchInput) {
                this.profileSearchInput.value = this.currentProfile;
            }
        }
        
        /**
        * Add a new field to the profile form
        */
        addField(field = null) {
            if (!this.isValidPage() || this.mode !== 'editing') return;
            
            // Determine if the field is a custom field
            let isCustomField;
            if (field === null) {
                isCustomField = true;
            } else if (field.isCustomField !== undefined) {
                isCustomField = field.isCustomField;
            } else {
                isCustomField = false;
            }
            
            // Create the form group container
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            // Create the label container
            const labelContainer = document.createElement('div');
            
            const CustomFieldClass = isCustomField ? ' custom-field' : '';
            
            // Create the label
            const label = document.createElement('label');
            label.className = 'form-label' + CustomFieldClass;
            if (isCustomField) {
                label.contentEditable = true;
                label.setAttribute('data-placeholder', 'Insert field label here');
            }
            label.textContent = field ? field.label : '';
            
            // Append label to label container
            labelContainer.appendChild(label);
            
            // Create the delete button for custom fields
            if (isCustomField) {
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-link p-0 ms-1 delete-custom-field';
                deleteButton.innerHTML = '<i class="bi bi-x-circle text-danger"></i>';
                deleteButton.title = 'Delete custom field';
                deleteButton.tabIndex = -1;
                labelContainer.appendChild(deleteButton);
            }
            
            // Create the input
            const input = document.createElement('input');
            input.type = field ? field.type : 'text';
            input.className = 'form-control' + CustomFieldClass;
            input.id = field ? field.id : '';
            input.name = field ? field.id : '';
            input.value = field ? field.value : '';
            if (field && field.placeholder) {
                input.placeholder = field.placeholder;
            }
            
            // Function to generate a sanitized, camelized ID from the label text
            const generateFieldId = (text) => {
                // Convert the text to camelCase
                return text.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
                // Remove all non-alphanumeric characters
                .replace(/[^a-zA-Z0-9]/g, '')
                .replace(/^[a-z]/, chr => chr.toLowerCase());
            };
            
            // Function to update the input's ID based on the label's content
            const updateFieldId = () => {
                const sanitizedId = generateFieldId(label.textContent);
                input.id = sanitizedId;
                input.name = sanitizedId;
            };
            
            // Add event listeners for custom field label editing
            if (isCustomField) {
                label.addEventListener('input', updateFieldId);
                label.addEventListener('blur', () => {
                    updateFieldId();
                    if (label.textContent.trim() === '') {
                        label.textContent = '';  // Ensure it's empty to show the placeholder
                    }
                });
            }
            
            // Append label container and input to form group
            formGroup.appendChild(labelContainer);
            formGroup.appendChild(input);
            
            // Append the new form group to the profile form
            this.profileForm.appendChild(formGroup);
            
            // Focus on the new label for immediate editing if it's a new custom field
            if (isCustomField && !field) {
                label.focus();
            }
        }
    }
    