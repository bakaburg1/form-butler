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
        this.init();
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
        const currentProfileName = result.currentProfile || 'Default';
        
        // Ensure there's at least a default profile
        if (this.profiles.length === 0) {
            this.profiles.push(this.getProfile('Default'));
        }
        
        // Set the current profile to the stored one or create a new default
        this.currentProfile = this.getProfile(currentProfileName);
        await this.saveProfiles();
        
        // Initialize UI components and load form fields
        this.initializeUI();
        this.loadFields();
        this.updateSearchInput();
    }

    /**
     * Set up event listeners and initialize UI elements
     */
    initializeUI() {
        // Get references to DOM elements
        this.profileForm = document.getElementById('profileForm');
        this.profileSearchInput = document.getElementById('profile-search');
        this.profileDropdownMenu = document.getElementById('profile-dropdown-menu');
        this.profileNameInput = document.getElementById('profile-name');

        // Set up event listeners for user interactions
        this.profileSearchInput.addEventListener('focus', () => this.showDropdown());
        this.profileSearchInput.addEventListener('input', () => this.filterProfiles());
        this.profileDropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        document.addEventListener('click', (event) => this.handleClickOutside(event));
        this.updateSearchInput();
    }

    /**
     * Load and display form fields based on the current profile
     * Merges the current profile with the default profile to ensure all fields are present
     */
    async loadFields() {
        if (!this.profileForm) return;

        // Clear existing form fields
        this.profileForm.innerHTML = '';
        this.profileNameInput.value = this.currentProfile.name;

        // Merge current profile with default profile to ensure all fields are present
        const mergedProfile = {...this.getDefaultProfile(), ...this.currentProfile.info};

        // Sort fields by position and create form elements
        Object.values(mergedProfile)
            .sort((a, b) => a.position - b.position)
            .forEach(field => {
                // Create form group container
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';

                // Create label for the field
                const label = document.createElement('label');
                label.htmlFor = field.id;
                label.className = 'form-label';
                label.textContent = field.label;

                // Create input element
                const input = document.createElement('input');
                input.type = field.type;
                input.className = 'form-control';
                input.id = field.id;
                input.name = field.id;
                input.value = field.value;
                if (field.placeholder) {
                    input.placeholder = field.placeholder;
                }

                // Append label and input to form group
                formGroup.appendChild(label);
                formGroup.appendChild(input);
                this.profileForm.appendChild(formGroup);
            });

        // Update UI components
        this.updateDropdownMenu();
        this.updateSearchInput();
    }

    /**
     * Save the current profile information
     * Updates the current profile or creates a new one if the name has changed
     */
    async saveInfoData() {
        if (!this.profileForm) return;

        // Get the profile name from the input field
        const profileName = this.profileNameInput.value.trim();
        if (!profileName) {
            throw new Error('Profile name cannot be empty');
        }

        // Collect updated info from form inputs
        const updatedInfo = {};
        const inputs = this.profileForm.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.value.trim() !== '') {
                updatedInfo[input.id] = {
                    id: input.id,
                    label: input.previousElementSibling.textContent,
                    type: input.type,
                    value: input.value.trim(),
                    position: parseInt(input.dataset.position) || 0
                };
            }
        });

        // Update existing profile or create a new one
        if (profileName === this.currentProfile.name) {
            this.currentProfile.info = updatedInfo;
        } else {
            const existingProfileIndex = this.profiles.findIndex(p => p.name === profileName);
            if (existingProfileIndex !== -1) {
                this.profiles[existingProfileIndex] = {name: profileName, info: updatedInfo};
            } else {
                this.profiles.push({name: profileName, info: updatedInfo});
            }
            this.currentProfile = {name: profileName, info: updatedInfo};
        }

        // Save profiles and update UI
        await this.saveProfiles();
        this.updateDropdownMenu();
    }

    /**
     * Save profiles to Chrome storage
     * @returns {Promise} A promise that resolves when the save is complete
     */
    async saveProfiles() {
        // Save profiles to Chrome storage
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set({ 
                profiles: this.profiles,
                currentProfile: this.currentProfile.name
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
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
            age: { id: 'age', label: 'Age', type: 'number', value: '', position: 3 },
            address: { id: 'address', label: 'Address', type: 'text', value: '', position: 4 },
            city: { id: 'city', label: 'City', type: 'text', value: '', position: 5 },
            region: { id: 'region', label: 'Region/State/Province', type: 'text', value: '', position: 6 },
            postalCode: { id: 'postalCode', label: 'Postal Code', type: 'text', value: '', position: 7 },
            country: { id: 'country', label: 'Country', type: 'text', value: '', position: 8 },
            email: { id: 'email', label: 'Email', type: 'email', value: '', position: 9 },
            phone: { id: 'phone', label: 'Phone', type: 'tel', value: '', position: 10 },
            birthDate: { id: 'birthDate', label: 'Birth Date', type: 'date', value: '', position: 11, placeholder: 'YYYY-MM-DD' }
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
            return this.currentProfile;
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
        this.updateDropdownMenu();
        this.profileDropdownMenu.style.display = 'block';
    }

    /**
     * Hide the profile dropdown menu
     */
    hideDropdown() {
        this.profileDropdownMenu.style.display = 'none';
    }

    /**
     * Update the dropdown menu with current profiles
     * Adds checkmarks to the current profile and delete icons to all profiles
     */
    updateDropdownMenu() {
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
            checkmark.style.display = profile.name === this.currentProfile.name ? 'inline-block' : 'none';

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
        this.currentProfile = profile;
        this.updateSearchInput();
        this.loadFields();
        this.hideDropdown();
    }

    /**
     * Delete a profile and update the UI
     * @param {Object} profileToDelete - The profile to delete
     */
    async deleteProfile(profileToDelete) {
        this.profiles = this.profiles.filter(profile => profile.name !== profileToDelete.name);
        
        if (this.profiles.length === 0) {
            this.profiles.push({name: 'Default', info: this.getDefaultProfile()});
        }

        if (this.currentProfile.name === profileToDelete.name) {
            this.currentProfile = this.profiles[0];
        }

        await this.saveProfiles();
        this.updateDropdownMenu();
        this.loadFields();
    }

    /**
     * Handle clicks outside the dropdown to close it
     * @param {Event} event - The click event
     */
    handleClickOutside(event) {
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
        if (this.currentProfile && this.profileSearchInput) {
            this.profileSearchInput.value = this.currentProfile.name;
        }
    }
}