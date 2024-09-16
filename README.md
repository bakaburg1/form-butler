# Form Butler

![Form Butler Logo](icon/icon128.png)

**Form Butler** is an intelligent Chrome extension powered by Language Learning Models (LLMs) that simplifies the process of filling out forms on websites. By leveraging advanced AI capabilities, Form Butler intelligently populates form fields with your personal information and payment details, enhancing your browsing and form-filling experience.

## Features

- **LLM-Powered Form Filling**: Utilizes Language Learning Models (LLMs) to intelligently populate form fields based on your profiles and payment information.
- **Auto-Fill on Focus**: Automatically fills forms when you focus on input fields, streamlining your data entry process.
- **Manual Fill Option**: Trigger form filling manually via the popup interface.
- **Profile Management**: Create, edit, and manage multiple user profiles containing your personal information for different form-filling scenarios.
- **Payment Card Management**: Securely store and manage multiple payment card details; card data is not sent to the LLM.
- **Model Configuration**: Choose between different LLM providers like OpenAI, Azure or local ones, configuring endpoints and API keys as needed.
- **Cloud-synced preferences**: Your preferences are synced across all your devices if you are logged in to chrome with the same google account.

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/bakaburg1/form-butler
   ```

2. **Navigate to the Extension Directory**

   ```bash
   cd form-butler
   ```

3. **Load the Extension in Chrome**

   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** by toggling the switch in the top right corner.
   - Click on **Load unpacked** and select the `form-butler` directory.

4. **Verify Installation**

   - Once loaded, you'll see the Form Butler icon in the Chrome toolbar.

## Usage

### Getting Started

1. **Open the Popup**

   - Click on the Form Butler icon in the Chrome toolbar to open the popup interface.

2. **Enable the Extension**

   - Ensure the **Enable Extension** checkbox is ticked to activate Form Butler.

3. **Configure Settings**

   - Use the options page to set up your LLM model, user profiles, and payment cards.

### Popup Interface

The popup provides quick access to Form Butler's primary functionalities:

- **Fill Form Button**: Manually trigger form filling on the active tab.
- **Auto-Fill on Focus**: Toggle automatic form filling when focusing on input fields.
- **Use Stored Completions**: Decide whether to skip LLM generation if a stored completion is available.
- **Open Options**: Access the detailed settings in the options page.
- **Model, Profile, and Payment Card Selection**: Choose which model, profile, and payment card to use for form filling.

### Options Page

Access the options page by clicking the **cog** icon in the popup or navigating to `chrome://extensions/`, selecting Form Butler, and clicking **Details** > **Extension options**.

#### LLM Model

- **Select Model**: Choose between available LLM models like OpenAI or Azure.
- **Configure API**: Enter necessary API specifications, endpoints, and keys.
- **Manage Models**: Add, edit, or delete custom models as per your requirements.

#### User Profiles

- **Create Profile**: Add new profiles containing your personal information.
- **Edit Profile**: Modify existing profiles to update your details.
- **Delete Profile**: Remove profiles that are no longer needed.
- **Search Profiles**: Quickly find profiles using the search functionality.

#### Payment Cards

- **Add Payment Card**: Store your credit/debit card details securely.
- **Edit Payment Card**: Update card information as needed.
- **Delete Payment Card**: Remove stored cards for enhanced security.
- **Search Cards**: Easily locate specific payment cards using the search feature.

## Configuration

### LLM Models

Form Butler supports multiple LLM providers. Configure your preferred provider in the options page under the **LLM Model** tab.

1. **Select API Specification**: Choose between available API specifications (currently OpenAI and Azure).
2. **Enter Model Details**:
   - **Model Name**: Specify the model or deployment ID.
   - **Endpoint URL**: Provide the API endpoint URL.
   - **API Key**: Input your API key for authentication.
3. **Save Configuration**: Click the **Save Model** button to store your settings.

### User Profiles

Manage your personal information efficiently by creating multiple profiles.

1. **Add Profile**: Click the **Add Profile** button and enter your details.
2. **Edit Profile**: Select a profile and modify the information as needed.
3. **Add extra fields**: Add extra fields to the profile to fill more complex forms.    
4. **Delete Profile**: Remove profiles that are outdated or no longer required.
5. **Select Active Profile**: Choose the profile you want to use for form filling.

### Payment Cards

Securely manage your payment information with Form Butler.

1. **Add Card**: Click the **Add Card** button and enter your card details.
2. **Edit Card**: Update existing card information as needed.
3. **Delete Card**: Remove cards that you no longer wish to store.
4. **Select Active Card**: Choose the card you want to use for autofill.

## Privacy

Form Butler is committed to protecting your privacy:

- **Data Storage**: All personal information and payment details are stored securely using Chrome's `storage.sync` API.
- **Data Handling**: Sensitive information, such as payment card numbers and CVVs, are masked before being processed by LLMs to ensure confidentiality.
- **No Data Sharing**: Your data is never shared with third parties beyond the necessary API interactions for form filling.

## Contributing

We welcome contributions to enhance Form Butler! Here's how you can get involved:

1. **Fork the Repository**

   Click the **Fork** button at the top-right corner of this repository to create your own fork.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/yourusername/form-butler.git
   cd form-butler
   ```

3. **Create a Feature Branch**

   ```bash
   git checkout -b feature/YourFeatureName
   ```

4. **Make Your Changes**

   Implement your feature or fix bugs as needed.

5. **Commit Your Changes**

   ```bash
   git commit -m "Add feature: YourFeatureName"
   ```

6. **Push to Your Fork**

   ```bash
   git push origin feature/YourFeatureName
   ```

7. **Open a Pull Request**

   Navigate to the original repository and click **Compare & pull request**. Provide a detailed description of your changes.

### Guidelines

- **Code Quality**: Ensure your code adheres to the existing coding standards and passes all linting checks.
- **Documentation**: Update the README and other relevant documentation to reflect your changes.
- **Testing**: Include tests for new features or bug fixes where applicable.

## License

MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions, issues, or feature requests, please open an issue on the [GitHub repository](https://github.com/bakaburg1/form-butler/issues) or contact us at [support@formbutler.com](mailto:support@formbutler.com).

---
