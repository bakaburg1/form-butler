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
    * Sets up initial state and triggers the initialization process
    */
    constructor() {
        // Initialize properties to null or empty arrays
        this.currentProfile = null;
        this.profiles = [];
        this.profileForm = null;
        this.profileSearchInput = null;
        this.profileDropdownMenu = null;
        this.profileNameInput = null;
        this.addFieldButton = null;
        this.saveButton = null;
    }
    
    /**
    * Initialize the ProfileManager
    * Loads profiles from Chrome storage, sets up the current profile,
    * and initializes the user interface
    */
    async init() {
        // Retrieve stored profiles and current profile from Chrome storage
        const result = await chrome.storage.sync.get(['profiles', 'currentProfile']);
        this.profiles = result.profiles || [];
        this.currentProfile = result.currentProfile || 'Default';
        
        // Ensure there's at least a default profile
        if (this.profiles.length === 0) {
            this.profiles.push(this.getProfile('Default'));
        }
        
        // Only initialize UI if not in background script
        if (this.isOptionsPage()) {
            this.initializeDOMReferences();
            this.initializeEventListeners();
            this.loadFields();
        }
    }
    
    initializeDOMReferences() {
        if (!this.isOptionsPage()) return;
        console.log('ProfileManager initializeDOMReferences() called');
        
        this.profileForm = document.getElementById('profileForm');
        this.profileSearchInput = document.getElementById('profile-search');
        this.profileDropdownMenu = document.getElementById('profile-dropdown-menu');
        this.profileNameInput = document.getElementById('profile-name');
        this.addFieldButton = document.getElementById('add-field-button');
        this.saveButton = document.getElementById('save-profile-button');
    }
    
    initializeEventListeners() {
        if (!this.isOptionsPage()) return;
        console.log('ProfileManager initializeEventListeners() called');

        this.profileSearchInput.addEventListener('focus', () => this.showDropdown());
        this.profileSearchInput.addEventListener('input', () => this.filterProfiles());
        this.profileDropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        this.addFieldButton.addEventListener('click', (event) => this.addField());
        this.saveButton.addEventListener('click', () => this.saveProfile());
        document.addEventListener('click', (event) => this.handleClickOutside(event));

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
    
    /**
    * Load and display form fields based on the current profile
    * Merges the current profile with the default profile to ensure all fields are present
    */
    loadFields() {
        if (!this.isOptionsPage()) return;
        if (!this.profileForm) return;
        
        // Clear existing form fields
        this.profileForm.innerHTML = '';
        this.profileNameInput.value = this.currentProfile;
        
        // Get the current profile data
        const currentProfileData = this.getProfile(this.currentProfile);
        
        // Merge current profile with default profile to ensure all fields are present
        const mergedProfile = {...this.getDefaultProfile(), ...currentProfileData.info};
        
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
    * Updates the current profile or creates a new one if the name has changed
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

        // Collect updated info from form inputs
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
            this.profiles[existingProfileIndex] = {name: profileName, info: updatedInfo};
        } else {
            // Create new profile
            this.profiles.push({name: profileName, info: updatedInfo});
        }
        this.currentProfile = profileName;
        
        // Save profiles and update UI
        this.saveProfilesToStorage()
    }

    saveProfilesToStorage(successCallback = null) {
        this.saveButton.disabled = true;
        
        chrome.storage.sync.set({ 
            profiles: this.profiles,
            currentProfile: this.currentProfile
        }, () => {
            let evt;

            if (chrome.runtime.lastError) {
                evt = new CustomEvent('profileSavingError', { detail: { error: chrome.runtime.lastError.message } })
            } else {
                evt = new CustomEvent('profileSaved');
                if (successCallback) {
                    successCallback();
                }
            }
            document.dispatchEvent(evt);
            this.saveButton.disabled = false;
        });
    }

    /**
    * Delete a profile and update the UI
    * @param {Object} profileToDelete - The profile to delete
    */
    async deleteProfile(profileToDelete) {
        if (!this.isOptionsPage()) return;

        this.profiles = this.profiles.filter(
            profile => profile.name !== profileToDelete.name);
        
        // Use the default profile if there are no profiles left
        if (this.profiles.length === 0) {
            this.profiles.push({name: 'Default', info: this.getDefaultProfile()});
        }
        
        // Select the first profile if the deleted one was the current one
        if (this.currentProfile === profileToDelete.name) {
            this.currentProfile = this.profiles[0].name;
        }
        
        // Save the updated profiles and update the UI
        this.saveProfilesToStorage(() => {
            this.loadFields();
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
            birthDate: { id: 'birthDate', label: 'Birth Date', type: 'date', value: '', position: 10, placeholder: 'YYYY-MM-DD' },
            age: { id: 'age', label: 'Age', type: 'number', value: '', position: 11 }
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
            return this.getProfile(this.currentProfile);
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
        let mergedInfo = {...defaultProfile.info, ...profile.info};
        
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
        if (!this.isOptionsPage()) return;
        this.updateDropdownMenu();
        this.profileDropdownMenu.style.display = 'block';
    }
    
    /**
    * Hide the profile dropdown menu
    */
    hideDropdown() {
        if (!this.isOptionsPage()) return;
        this.profileDropdownMenu.style.display = 'none';
    }
    
    /**
    * Update the dropdown menu with current profiles
    * Adds checkmarks to the current profile and delete icons to all profiles
    */
    updateDropdownMenu() {
        if (!this.isOptionsPage()) return;
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
            
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'bi bi-x-circle text-danger delete-profile hide showOnHover';
            
            link.appendChild(nameSpan);
            link.appendChild(deleteIcon);
            item.appendChild(link);
            this.profileDropdownMenu.appendChild(item);
        });
    }
    
    /**
    * Filter profiles in the dropdown based on search input
    */
    filterProfiles() {
        if (!this.isOptionsPage()) return;
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
        if (!this.isOptionsPage()) return;
        const profileItem = event.target.closest('.dropdown-item');
        
        if (event.target.classList.contains('delete-profile')) {
            event.preventDefault();
            event.stopPropagation();
            const profileName = profileItem.dataset.profileName;
            const profile = this.getProfile(profileName);
            this.deleteProfile(profile);
        } else if (profileItem) {
            const profileName = profileItem.dataset.profileName;
            const profile = this.getProfile(profileName);
            this.selectProfile(profile);
        }
    }
    
    /**
    * Get a profile by its name
    * @param {string} name - The name of the profile to retrieve
    * @returns {Object|undefined} The profile object if found, undefined otherwise
    */
    getProfileByName(name) {
        return this.profiles.find(p => p.name === name);
    }
    
    /**
    * Select a profile and update the UI
    * @param {Object} profile - The profile to select
    */
    selectProfile(profile) {
        if (!this.isOptionsPage()) return;
        this.currentProfile = profile.name;
        this.updateSearchInput();
        this.loadFields();
        this.hideDropdown();
    }
    
    /**
    * Handle clicks outside the dropdown to close it
    * @param {Event} event - The click event
    */
    handleClickOutside(event) {
        if (!this.isOptionsPage()) return;
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
            if (!this.isOptionsPage()) return;
            if (this.currentProfile && this.profileSearchInput) {
                this.profileSearchInput.value = this.currentProfile;
            }
        }
        
        /**
        * Add a new field to the profile form
        */
        addField(field = null) {
            if (!this.isOptionsPage()) return;
            
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
        
        isOptionsPage() {
            return location.pathname.includes('options.html');
        }
    }