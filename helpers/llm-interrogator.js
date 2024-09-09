/**
* Provides an interface for interacting with a large language model (LLM) service, such as OpenAI (and compatible services) or Azure OpenAI.
* The `LLMInterrogator` class handles the communication with the LLM service, including sending prompts and processing the responses.
* It supports both OpenAI and Azure OpenAI API interfaces, and allows for customization of the model, endpoint, and API key.
*/
class LLMInterrogator {
    constructor(options = {}) {
      
      if (!options.apiSpecification || !['azure', 'openai'].includes(options.apiSpecification)) {
        throw new Error('API specification must be either "azure" or "openai"');
      }
      if (!options.endpoint) throw new Error('Endpoint is missing');
      
      this.apiSpecification = options.apiSpecification || 'openai';
      this.apiKey = options.apiKey;
      this.model = options.model;
      this.endpoint = options.endpoint.replace(/^https?:\/\//, '');
      this.apiVersion = options.apiVersion;
      this.abortController = new AbortController();
    }
    
    /**
    * Sends a request to the LLM (Large Language Model) service with the provided messages and parameters.
    * 
    * @param {Array<{role: string, content: string}>|string} messages - The messages to send to the LLM service. Can be an array of message objects or a single string.
    * @param {Object} [params={}] - Additional parameters to include in the request, such as `temperature`.
    * @param {boolean} [forceJson=true] - If true, the response format will be forced to a JSON object.
    * @returns {Promise<{content: string[], usage: Object}>} - The response from the LLM service, including the generated content and usage information.
    */
    async promptLLM(messages, params = { temperature: 0 }, forceJson = true) {
      this.abortController = new AbortController();
      
      const processedMessages = this.processMessages(messages);
      const body = {
        ...params,
        messages: processedMessages
      };
      
      if (forceJson) {
        body.response_format = { type: "json_object" };
      }
      
      let response;
      try {
        response = await this.sendRequest(body);
  
        console.log("POST response:", response);
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          console.warn(`Rate limit exceeded. Waiting for ${retryAfter} seconds before retrying.`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          response = await this.sendRequest(body);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('LLM request was aborted');
          throw new Error('LLM request was aborted');
        }
        console.error('Error in LLM request:', error);
        throw error;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error in LLM request: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const parsedResponse = await response.json();
      console.log(parsedResponse);
      
      return {
        content: parsedResponse.choices.map(choice => choice.message.content),
        usage: parsedResponse.usage
      };
    }
    
    /**
    * Processes an array of user messages into a format suitable for sending to an LLM service.
    *
    * @param {(string|{role: string, content: string})[]} messages - An array of user messages, where each message can be a string or an object with `role` and `content` properties.
    * @returns {Array<{role: string, content: string}>} - An array of processed messages, where each message is an object with `role` and `content` properties.
    * @throws {Error} - If the `messages` parameter is missing, is not an array, or contains invalid message formats.
    */
    processMessages(messages) {
      if (!messages || messages.length === 0) {
        throw new Error('User messages are required.');
      }
      
      if (typeof messages === 'string') {
        return [{ role: 'user', content: messages }];
      }
      
      if (Array.isArray(messages)) {
        return messages.map(msg => {
          if (typeof msg === 'string') {
            return { role: 'user', content: msg };
          }
          if (msg.role && msg.content) {
            return msg;
          }
          throw new Error('Invalid message format');
        });
      }
      
      throw new Error('Invalid messages format');
    }
    
    /**
    * Sends a request to an LLM (Large Language Model) service with the provided request body.
    *
    * @param {Object} body - The request body to be sent to the LLM service.
    * @returns {Promise<Response>} - A Promise that resolves to the Response object from the LLM service.
    * @throws {Error} - If the LLM API is not supported or if there is an error during the request.
    */
    async sendRequest(body) {
      let url, headers;
      
      console.log("Sending to LLM...");
      console.log("API specification:", this.apiSpecification);
      console.log("Body:", body);
      
      switch (this.apiSpecification) {
        case 'openai':
        url = `https://${this.endpoint}/v1/chat/completions`;
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        };
        if (this.model) { // Some endpoint expose only one model, so if this field is empty it should not be added to the request body
          body.model = this.model;
        }
        break;
        case 'azure':
        url = `https://${this.endpoint}.openai.azure.com/openai/deployments/${this.model}/chat/completions?api-version=${this.apiVersion}`;
        headers = {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        };
        break;
        default:
        throw new Error('Unsupported LLM API');
      }
      
      console.log("URL:", url);
      console.log("Headers:", headers);
      
      return fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: this.abortController.signal
      });
    }
    
    /**
    * Aborts the current request to the LLM service.
    */
    abortRequest() {
      this.abortController.abort();
    }
  }