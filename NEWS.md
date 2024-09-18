# Changelog

## [0.2.0] - 2024-09-18

### Enhanced Form Data Collection and Improved Error Handling

#### Enhancements
- **Enhanced Form Data Collection**: Introduced a global variable for all input-related element tags, added a function to assign unique IDs to all input elements within forms, and enhanced the `collectFormData` function to simplify HTML and reduce the number of tokens sent to the LLM. Improved the `fillFormFields` function to handle cases where fields are already filled or no value is provided.
- **Credit Card Management**: Implemented credit card management, allowing users to securely store and manage multiple payment card details.
- **Enable/Disable Extension**: Added a checkbox in the popup to enable or disable the extension, with the state saved in `chrome.storage.sync`.
- **Streamlined Initialization Process**: Refactored the initialization process for `profileManager`, `cardManager`, and `llmInterrogator` to ensure they are initialized within the `processFormCompletion` function.

#### Fixes
- **Prevent Multiple Form Completion Requests**: Added a flag to prevent multiple form completion requests from being sent simultaneously, ensuring only one request is processed at a time.
- **Include Form ID in Error Messages**: Added `formId` to error messages sent to content scripts when LLM is not configured or an error occurs during form completion.
- **Syntax Error Fix in CSS**: Corrected a syntax error in `content.css`.

#### Documentation
- **Update Form Fill Guidelines**: Updated `form_fill.txt` guidelines to clarify selector usage, emphasizing the use of IDs over name or attribute selectors and avoiding card instructions if no card fields are present in the form.
- **Changelog and License**: Added `NEWS.md` for changelog and `LICENSE` file for MIT License.

### Summary
This update introduces significant enhancements to the Form Butler extension, including improved form data collection, credit card management, and the ability to enable or disable the extension. It also addresses multiple fixes to ensure smoother operation and better error handling. Documentation updates provide clearer guidelines for form filling and include a changelog and license information.

# [1.0.0] - 2024-09-16

### Initial Release

- Initial release of **Form Butler** Chrome extension. (!! not ready for production !!)
- Features:
  - **LLM-Powered Form Filling**
  - **Auto-Fill on Focus**
  - **Manual Fill Option**
  - **Profile Management**
  - **Payment Card Management**
  - **Model Configuration**
  - **Cloud-synced Preferences**