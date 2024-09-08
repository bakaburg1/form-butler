class PersonalInfoManager {
    constructor() {
        this.currentProfile = null;
        this.profiles = [];
        this.personalForm = null;
        this.profileSearchInput = null;
        this.profileDropdownMenu = null;
        this.profileNameInput = null;
        this.init();
    }

    async init() {
        const result = await chrome.storage.sync.get(['profiles', 'currentProfile']);
        this.profiles = result.profiles || [];
        const currentProfileName = result.currentProfile || 'Default';
        
        if (this.profiles.length === 0) {
            this.profiles.push(this.getProfile('Default'));
        }
        
        this.currentProfile = this.getProfile(currentProfileName);
        await this.saveProfiles();
        
        this.initializeUI();
        this.updateSearchInput(); // Add this line
    }

    initializeUI() {
        this.personalForm = document.getElementById('personalInfoForm');
        this.profileSearchInput = document.getElementById('profile-search');
        this.profileDropdownMenu = document.getElementById('profile-dropdown-menu');
        this.profileNameInput = document.getElementById('profile-name');

        this.profileSearchInput.addEventListener('focus', () => this.showDropdown());
        this.profileSearchInput.addEventListener('input', () => this.filterProfiles());
        this.profileDropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        document.addEventListener('click', (event) => this.handleClickOutside(event));
        this.updateSearchInput(); // Add this line
    }

    async loadFields() {
        if (!this.personalForm) return;

        this.personalForm.innerHTML = '';
        this.profileNameInput.value = this.currentProfile.name;

        Object.values(this.currentProfile.info)
            .sort((a, b) => a.position - b.position)
            .forEach(field => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';

                const label = document.createElement('label');
                label.htmlFor = field.id;
                label.className = 'form-label';
                label.textContent = field.label;

                const input = document.createElement('input');
                input.type = field.type;
                input.className = 'form-control';
                input.id = field.id;
                input.name = field.id;
                input.value = field.value;

                formGroup.appendChild(label);
                formGroup.appendChild(input);
                this.personalForm.appendChild(formGroup);
            });

        this.updateDropdownMenu();
        this.updateSearchInput(); // Add this line at the end of the method
    }

    async saveInfoData() {
        if (!this.personalForm) return;

        const profileName = this.profileNameInput.value.trim();
        if (!profileName) {
            throw new Error('Profile name cannot be empty');
        }

        const updatedInfo = {};
        Object.keys(this.currentProfile.info).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                updatedInfo[key] = {...this.currentProfile.info[key], value: element.value};
            }
        });

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

        await this.saveProfiles();
        this.updateDropdownMenu();
    }

    async saveProfiles() {
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

    getDefaultPersonalInfo() {
        return {
            firstName: { id: 'firstName', label: 'First Name', type: 'text', value: '', position: 1 },
            lastName: { id: 'lastName', label: 'Last Name', type: 'text', value: '', position: 2 },
            address: { id: 'address', label: 'Address', type: 'text', value: '', position: 3 },
            city: { id: 'city', label: 'City', type: 'text', value: '', position: 4 },
            state: { id: 'state', label: 'State', type: 'text', value: '', position: 5 },
            zipCode: { id: 'zipCode', label: 'ZIP Code', type: 'text', value: '', position: 6 },
            country: { id: 'country', label: 'Country', type: 'text', value: '', position: 7 },
            email: { id: 'email', label: 'Email', type: 'email', value: '', position: 8 },
            phone: { id: 'phone', label: 'Phone', type: 'tel', value: '', position: 9 }
        };
    }

    getProfile(name) {
        if (!name) {
            return this.currentProfile;
        }
        return this.profiles.find(p => p.name === name) || {
            name: 'Default',
            info: this.getDefaultPersonalInfo()
        };
    }

    showDropdown() {
        this.updateDropdownMenu();
        this.profileDropdownMenu.style.display = 'block';
    }

    hideDropdown() {
        this.profileDropdownMenu.style.display = 'none';
    }

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

    filterProfiles() {
        const searchTerm = this.profileSearchInput.value.toLowerCase().trim();
        const items = this.profileDropdownMenu.querySelectorAll('.dropdown-item');
        
        items.forEach(item => {
            const profileName = item.dataset.profileName;
            const matchesSearch = profileName.toLowerCase().includes(searchTerm);
            item.style.display = matchesSearch ? '' : 'none';
        });
    }

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

    getProfileByName(name) {
        return this.profiles.find(p => p.name === name);
    }

    selectProfile(profile) {
        this.currentProfile = profile;
        this.updateSearchInput(); // Add this line
        this.loadFields();
        this.hideDropdown();
    }

    async deleteProfile(profileToDelete) {
        this.profiles = this.profiles.filter(profile => profile.name !== profileToDelete.name);
        
        if (this.profiles.length === 0) {
            this.profiles.push({name: 'Default', info: this.getDefaultPersonalInfo()});
        }

        if (this.currentProfile.name === profileToDelete.name) {
            this.currentProfile = this.profiles[0];
        }

        await this.saveProfiles();
        this.updateDropdownMenu();
        this.loadFields();
    }

    handleClickOutside(event) {
        if (
            !this.profileSearchInput.contains(event.target) &&
            !this.profileDropdownMenu.contains(event.target)) {
            this.hideDropdown();
        }
    }

    // Add this new method
    updateSearchInput() {
        if (this.currentProfile && this.profileSearchInput) {
            this.profileSearchInput.value = this.currentProfile.name;
        }
    }
}