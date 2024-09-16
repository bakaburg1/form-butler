/**
* Manages credit card configurations for the Chrome extension.
* This class handles various operations related to cards, including:
* - Selection and display of cards in a dropdown menu
* - Saving and deleting card configurations
* - Updating UI elements based on selected cards
* - Handling user interactions with the card management interface
*/
class CardManager {
    constructor() {
        this.containerElement = null;
        this.mode = null;
        
        // DOM element references
        this.searchInput = null;
        this.dropdownMenu = null;
        this.cardNameInput = null;
        this.cardHolderInput = null;
        this.cardNumberInput = null;
        this.expiryMonthInput = null;
        this.expiryYearInput = null;
        this.ccvInput = null;
        this.saveButton = null;
        this.cardStatus = null;
        
        // Default values and state variables
        this.cards = []; // Array to store all available cards
        this.currentCard = null; // Stores the card name
    }

    /**
    * Initializes the CardManager by performing the following steps:
    * 1. Loads saved cards and current card from storage
    * 2. Sets up the container element and mode
    * 3. Initializes DOM references, event listeners, and cards
    * 4. Loads fields for the current card if in editing mode
    * 5. Updates the search input and dropdown menu UI
    *
    * @param {string} [containerElement="#card-manager-container"] - The
    * selector for the container element
    * @param {string} [mode='editing'] - The mode of operation ('editing' or
    * 'selection')
    * @returns {Promise<void>}
    */
    async init(containerElement = "#card-manager-container", mode = 'editing') {
        const result = await chrome.storage.sync.get(['cards', 'currentCard']);
        this.cards = result.cards || [];
        this.currentCard = result.currentCard || (this.cards.length > 0 ? this.cards[0].name : null);
        
        this.mode = mode;
        
        if (!this.isValidPage()) {
            console.log('Card manager initialized in no-UI mode');
            return;
        }

        this.containerElement = document.querySelector(containerElement);
        
        if (!this.containerElement) {
            console.log('Card manager container element not found');
            return;
        }
        
        this.initializeDOMReferences();
        this.initializeEventListeners();
        this.initializeCards();

        // Show the current card
        this.selectCard(this.currentCard);
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
        this.searchInput = document.getElementById('card-search');
        this.dropdownMenu = document.getElementById('card-dropdown-menu');
        
        if (this.mode === 'editing') {
            this.cardNameInput = document.getElementById('card-name-input');
            this.cardHolderInput = document.getElementById('card-holder-input');
            this.cardNumberInput = document.getElementById('card-number-input');
            this.expiryMonthInput = document.getElementById('expiry-month-input');
            this.expiryYearInput = document.getElementById('expiry-year-input');
            this.ccvInput = document.getElementById('ccv-input');
            this.saveButton = document.getElementById('save-card-button');
            this.cardStatus = document.getElementById('card-status');
        }
    }

    /**
    * Generates the editing UI using the provided HTML structure and appends it to the container element.
    */
    createEditingUI() {
        const editingTemplate = `
            <form id="card-form" class="options-form">
                <div class="dropdown form-group">
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <input type="text" id="card-search" class="form-control" placeholder="Search cards">
                    </div>
                    <ul class="dropdown-menu" id="card-dropdown-menu">
                        <!-- Dropdown items will be dynamically populated here -->
                    </ul>
                </div>

                <div class="form-group">
                    <label for="card-name-input">Card Name</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-card-text"></i></span>
                        <input type="text" id="card-name-input" class="form-control" placeholder="Card Name">
                    </div>
                </div>

                <div class="form-group">
                    <label for="card-holder-input">Card Holder Name</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-person"></i></span>
                        <input type="text" id="card-holder-input" class="form-control" placeholder="Card Holder Name">
                    </div>
                </div>

                <div class="form-group">
                    <label for="card-number-input">Card Number</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-credit-card"></i></span>
                        <input type="text" id="card-number-input" class="form-control" placeholder="Card Number">
                    </div>
                </div>

                <div class="form-group row">
                    <div class="col">
                        <label for="expiry-month-input">Expiry Month</label>
                        <input type="text" id="expiry-month-input" class="form-control" placeholder="MM">
                    </div>
                    <div class="col">
                        <label for="expiry-year-input">Expiry Year</label>
                        <input type="text" id="expiry-year-input" class="form-control" placeholder="YY">
                    </div>
                    <div class="col">
                        <label for="ccv-input">CCV</label>
                        <input type="password" id="ccv-input" class="form-control" placeholder="CCV">
                    </div>
                </div>
            </form>
            <div class="row mt-3 align-items-center">
                <div class="col-auto">
                    <button id="save-card-button" class="btn btn-primary">Save Card</button>
                </div>
                <div class="col">
                    <div id="card-status" class="status-message hide"></div>
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
                    <input type="text" id="card-search" class="form-control" placeholder="Search cards">
                </div>
                <ul class="dropdown-menu" id="card-dropdown-menu">
                    <!-- Dropdown items will be dynamically populated here -->
                </ul>
            </div>
        `;
        this.containerElement.innerHTML = selectionTemplate;
    }

    /**
    * Sets up event listeners for various UI elements to handle user interactions.
    * This includes listeners for the search input, dropdown menu, save button.
    */
    initializeEventListeners() {
        if (!(this.containerElement || this.isValidPage())) return;
        
        this.searchInput.addEventListener('focus', () => this.showDropdown());
        this.searchInput.addEventListener('input', () => this.filterCards());
        this.dropdownMenu.addEventListener('click', (event) => this.onDropdownItemClick(event));
        
        document.addEventListener('click', (event) => this.handleClickOutside(event));
        
        if (this.mode === 'editing') {
            if (this.saveButton) {
                this.saveButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.saveCard();
                });
            }
        }
    }

    /**
    * Initializes cards. Ensures that card names are unique.
    */
    initializeCards() {
        // No need to generate IDs, we use 'name' provided by the user.
    }

    /**
    * Loads saved fields for the current card. If a current card exists,
    * populates the UI fields with its data.
    */
    loadFields() {
        if (!(this.containerElement || this.isValidPage()) || this.mode !== 'editing') return;
        if (!this.cardNameInput || !this.cardHolderInput || !this.cardNumberInput || !this.expiryMonthInput || !this.expiryYearInput || !this.ccvInput) return;
        
        if (this.currentCard && this.cards.length > 0) {
            const currentCardDetails = this.getCard(this.currentCard);
            
            if (currentCardDetails) {
                this.cardNameInput.value = currentCardDetails.name || '';
                this.cardHolderInput.value = currentCardDetails.holderName || '';
                this.cardNumberInput.value = currentCardDetails.number || '';
                this.expiryMonthInput.value = currentCardDetails.expiryMonth || '';
                this.expiryYearInput.value = currentCardDetails.expiryYear || '';
                this.ccvInput.value = currentCardDetails.ccv || '';
            }
        }
    }

    /**
    * Saves the current card to the list of cards and updates the storage.
    *
    * If a card with the same name exists, it updates that card.
    * Otherwise, it adds a new card to the list.
    */
    saveCard() {
        if (!(this.containerElement || this.isValidPage()) || this.mode !== 'editing') return;
        
        if (this.saveButton) {
            this.saveButton.disabled = true;
        }
        
        const newCard = {
            name: this.cardNameInput.value.trim(),
            holderName: this.cardHolderInput.value.trim(),
            number: this.cardNumberInput.value.trim(),
            expiryMonth: this.expiryMonthInput.value.trim(),
            expiryYear: this.expiryYearInput.value.trim(),
            ccv: this.ccvInput.value.trim()
        };
        
        if (!newCard.name) {
            alert('Please provide a name for the card.');
            this.saveButton.disabled = false;
            return;
        }
        
        const existingIndex = this.cards.findIndex(c => c.name === newCard.name);
        
        if (existingIndex !== -1) {
            this.cards[existingIndex] = newCard;
        } else {
            this.cards.push(newCard);
        }
        
        this.currentCard = newCard.name;
        this.saveCardsToStorage();
    }

    /**
    * Saves the current list of cards to Chrome's sync storage.
    *
    * If the save is successful, it calls the provided success callback. If an
    * error occurs during saving, it logs the error and dispatches an error
    * event. After saving (successful or not), it enables the save button.
    *
    * @param {Function} successCallback - Function to be called if the save is
    * successful
    */
    saveCardsToStorage(successCallback = null) {
        if (this.saveButton) {
            this.saveButton.disabled = true;
        }
        
        chrome.storage.sync.set({
            cards: this.cards,
            currentCard: this.currentCard
        }, () => {
            let evt;
            
            if (chrome.runtime.lastError) {
                console.error('Error saving card:', chrome.runtime.lastError);
                evt = new CustomEvent('cardSavingError', { detail: { error: chrome.runtime.lastError.message } });
                if (this.cardStatus) {
                    this.cardStatus.textContent = `Error saving card: ${chrome.runtime.lastError.message}`;
                    this.cardStatus.classList.remove('hide');
                }
            } else {
                console.log('Card saved');
                evt = new CustomEvent('cardSaved');
                if (this.cardStatus) {
                    this.cardStatus.textContent = 'Card saved successfully.';
                    this.cardStatus.classList.remove('hide');
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
    * Deletes the specified card from the list of cards and updates the storage.
    * After deleting, it updates the dropdown menu and filters the cards.
    * @param {string} cardName - The name of the card to be deleted.
    */
    deleteCard(cardName) {
        if (!(this.containerElement || this.isValidPage())) return;
        
        this.cards = this.cards.filter(card => card.name !== cardName);
        
        // If the deleted card was the current card, clear currentCard
        if (this.currentCard && this.currentCard === cardName) {
            // Find the first card in the card list
            if (this.cards.length > 0) {
                this.currentCard = this.cards[0].name;
            } else {
                this.currentCard = null;
            }
        }
        
        this.saveCardsToStorage(() => {
            this.updateDropdownMenu();
            this.filterCards();
        });
    }

    /**
    * Retrieves a card by name or returns the current card if no name is provided.
    * @param {string|null} cardName - The name of the card to retrieve or null.
    * @returns {Object|null} The found card or null if not found.
    */
    getCard(cardName = null) {
        if (cardName === null) {
            cardName = this.currentCard;
        }
        
        return this.cards.find(c => c.name === cardName) || null;
    }

    /**
    * Selects the specified card and updates the form fields accordingly. This
    * method is called when a user clicks on a card in the dropdown menu.
    * @param {string} cardName - The name of the card to be selected.
    */
    selectCard(cardName) {
        if (!(this.containerElement || this.isValidPage())) return;
        const card = this.getCard(cardName);
        if (!card) return;
        
        this.currentCard = cardName;
        
        if (this.mode === 'editing') {
            // Update UI fields with selected card data
            this.loadFields();
        } else if (this.mode === 'selection') {
            // Store the selected card in storage
            chrome.storage.sync.set({ currentCard: this.currentCard }, () => {
                console.log('Card selected:', this.currentCard);
            });
        }
        
        this.hideDropdown();
        this.updateDropdownMenu(); // Refresh dropdown to show updated card list
        this.updateSearchInput(); // Refresh search input to show updated selected card
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
    * a card.
    */
    hideDropdown() {
        if (!(this.containerElement || this.isValidPage())) return;
        this.dropdownMenu.style.display = 'none';
    }

    /**
    * Updates the dropdown menu with available cards. This method creates the HTML
    * structure for the dropdown, including individual card entries with
    * selection indicators and delete buttons.
    */
    updateDropdownMenu() {
        if (!(this.containerElement || this.isValidPage())) return;
        this.dropdownMenu.innerHTML = ''; // Clear existing content
        
        // Check if there are no cards
        if (this.cards.length === 0) {
            this.hideDropdown();
            return;
        }
        
        this.cards.forEach((card) => {
            const item = document.createElement('li');
            let checkIconDisplay = this.currentCard && card.name === this.currentCard ? 'inline-block' : 'none';
            
            item.innerHTML = `
                <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" data-card-name="${card.name}">
                    <span>
                        <i class="bi bi-check text-success me-2" style="display: ${checkIconDisplay}"></i>
                        ${card.name || 'Unnamed Card'}
                    </span>
                    ${this.mode === 'editing' ? '<i class="bi bi-x-circle text-danger delete-card hide showOnHover"></i>' : ''}
                </a>
            `;
            this.dropdownMenu.appendChild(item);
        });
    }

    /**
    * Filters the cards displayed in the dropdown menu based on the search term.
    * This method is called every time the user types in the search input, providing real-time filtering.
    */
    filterCards() {
        if (!(this.containerElement || this.isValidPage())) return;
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const items = this.dropdownMenu.querySelectorAll('.dropdown-item');
        
        items.forEach(item => {
            const cardName = item.dataset.cardName;
            const card = this.getCard(cardName);
            if (card) {
                // Check if the card name matches the search term
                const matchesSearch = card.name.toLowerCase().includes(searchTerm);
                item.style.display = matchesSearch ? '' : 'none';
            }
        });
    }

    /**
    * Updates the search input with the current card's name. This method is
    * typically called after loading a card or changing the current card.
    */
    updateSearchInput() {
        if (!(this.containerElement || this.isValidPage()) || !this.searchInput) return;
        if (this.currentCard) {
            const currentCardDetails = this.getCard();
            this.searchInput.value = currentCardDetails.name || '';
        } else {
            this.searchInput.value = '';
        }
    }

    /**
    * Hides the dropdown menu when the user clicks outside of the search input
    * or the dropdown menu. This helps in maintaining a clean UI when the user
    * is not interacting with the card selection.
    * @param {Event} event - The click event that triggered this function.
    */
    handleClickOutside(event) {
        if (!(this.containerElement || this.isValidPage())) return;
        if (!this.searchInput.contains(event.target) && !this.dropdownMenu.contains(event.target)) {
            this.hideDropdown();
        }
    }

    /**
    * Handles click events on dropdown items in the card dropdown menu. This
    * method determines whether the click was on a delete button or a card
    * selection, and calls the appropriate method to handle the action.
    * @param {Event} event - The click event object.
    */
    onDropdownItemClick(event) {
        if (!(this.containerElement || this.isValidPage())) return;
        const cardItem = event.target.closest('.dropdown-item');
        
        if (event.target.classList.contains('delete-card')) {
            event.preventDefault();
            event.stopPropagation();
            const cardName = cardItem.dataset.cardName;
            this.deleteCard(cardName);
        } else {
            if (cardItem) {
                const cardName = cardItem.dataset.cardName;
                this.selectCard(cardName);
            }
        }
    }
}
