import { GoogleGenAI, Type } from "@google/genai";
import type { ApiResponse } from '../types';
import { webSettingsService } from './webSettingsService';

// Cache for API instance to avoid recreation
let aiInstance: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

// No default API key for security - users must provide their own
const DEFAULT_API_KEY = ''; // Users must configure their own API key

const getAIInstance = async (customApiKey?: string): Promise<GoogleGenAI> => {
  let apiKeyToUse = customApiKey;

  // If running in Electron, try to get the stored API key
  if (!apiKeyToUse && typeof window !== 'undefined' && window.electronAPI) {
    try {
      const storedKey = await window.electronAPI.getGeminiApiKey();
      if (storedKey && storedKey.trim()) {
        apiKeyToUse = storedKey.trim();
      }
    } catch (error) {
      console.warn('Could not load stored API key:', error);
    }
  }

  // If running in web mode, try to get the stored API key from web settings
  if (!apiKeyToUse && typeof window !== 'undefined' && !window.electronAPI) {
    try {
      const storedKey = await webSettingsService.getGeminiApiKey();
      if (storedKey && storedKey.trim()) {
        apiKeyToUse = storedKey.trim();
      }
    } catch (error) {
      console.warn('Could not load stored API key from web settings:', error);
    }
  }

  // Fallback to environment variable
  if (!apiKeyToUse && process.env.API_KEY) {
    apiKeyToUse = process.env.API_KEY;
  }

  // Fallback to default API key (empty - user must configure)
  if (!apiKeyToUse) {
    throw new Error(
      'No Gemini API key configured. Please:\n' +
      '1. Get a free API key from https://aistudio.google.com/app/apikey\n' +
      '2. Configure it in the app settings\n' +
      '3. Or set the GEMINI_API_KEY environment variable'
    );
  }

  // Recreate instance if API key changed
  if (!aiInstance || currentApiKey !== apiKeyToUse) {
    console.log('Creating new AI instance with', apiKeyToUse === DEFAULT_API_KEY ? 'default' : 'custom', 'API key');
    aiInstance = new GoogleGenAI({ apiKey: apiKeyToUse });
    currentApiKey = apiKeyToUse;
  }

  return aiInstance;
};

// Helper to convert an image URL to a base64 string with better error handling
const convertImageURLToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  try {
    console.log('Converting image URL to base64:', url.substring(0, 50) + '...');
    
    // Check if it's already a data URL
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      if (parts.length !== 2) {
        throw new Error('Invalid data URL format');
      }
      
      const mimeMatch = parts[0].match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const base64 = parts[1];
      
      console.log('Data URL processed directly, MIME type:', mimeType, 'Base64 length:', base64.length);
      return { base64, mimeType };
    }
    
    // For blob URLs or regular URLs, use fetch
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Image blob obtained, size:', blob.size, 'type:', blob.type);
    
    // Validate image size (max 20MB)
    if (blob.size > 20 * 1024 * 1024) {
      throw new Error('Image file is too large. Please use an image smaller than 20MB.');
    }
    
    // Get MIME type from blob, fallback to image/png for screenshots
    const mimeType = blob.type || 'image/png';
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          if (base64String) {
            console.log('Base64 conversion successful, length:', base64String.length);
            resolve({ base64: base64String, mimeType });
          } else {
            reject(new Error('Could not extract base64 string from data URL.'));
          }
        } else {
          reject(new Error('Failed to read blob as a data URL.'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Update responseSchema to accept dynamic messageCount
const getResponseSchema = (messageCount: number) => ({
  type: Type.OBJECT,
  properties: {
    chatMessages: {
      type: Type.ARRAY,
      description: `An array of ${messageCount} distinct chat messages.`,
      items: {
        type: Type.OBJECT,
        properties: {
          message: {
            type: Type.STRING,
            description: "A single chat message with no special characters or punctuation. ONLY letters and spaces are allowed."
          }
        },
        required: ["message"]
      }
    }
  },
  required: ["chatMessages"]
});

export const generateChatResponses = async (
  imageUrl: string,
  isFunnier: boolean = false,
  customPrompt: string = '',
  messageCount: number = 5
): Promise<ApiResponse> => {
  try {
    console.log('Generating chat responses for image:', imageUrl.substring(0, 50) + '...');
    
    const ai = await getAIInstance();
    const imageData = await convertImageURLToBase64(imageUrl);
    const imagePart = {
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    };

    // Prompt logic:
    // - If customPrompt is set, always use it as the AI prompt (user-defined)
    // - If not, use default basePrompt or funnyPrompt depending on isFunnier
    // - Custom actions (customButtonLabel) should pass a customPrompt string for the AI prompt
    let promptText = '';
    const punctuationRule = " CRUCIAL RULE: Every message you generate must not contain any special characters or punctuation. This means no commas, periods, apostrophes, quotation marks, hyphens, etc. Only use letters and spaces.";
    if (customPrompt && customPrompt.trim()) {
      // Always use user custom prompt, append punctuation rule
      promptText = customPrompt + punctuationRule;
    } else if (isFunnier) {
      promptText = `You are an absolutely UNHINGED AI comedian for the MMORPG New World. Your goal is to generate the most absurd, nonsensical, and stupidly funny chat messages imaginable based on the screenshot. Go completely over the top. Think chaotic goblin energy. The player wants to spam chat with pure nonsense. Generate ${messageCount} distinct chat messages.` + punctuationRule;
    } else {
      promptText = `You are a hilarious AI assistant for the MMORPG New World. Your task is to generate funny, context-aware chat messages full of stupid jokes that a player could use. Based on the provided screenshot, generate ${messageCount} distinct chat messages. The messages should sound like a real player who isn't very serious and loves to joke around.` + punctuationRule;
    }
    const textPart = {
      text: promptText
    };
    console.log('Sending request to Gemini API...');
    const responseSchema = getResponseSchema(messageCount);
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: isFunnier ? 0.9 : 0.7, // Higher temperature for funnier responses
        topP: isFunnier ? 0.9 : 0.8,
        maxOutputTokens: 1000,
      }
    });
    console.log('Received response from Gemini API');
    const jsonString = result.text?.trim() || '';
    if (!jsonString) {
      console.warn('Empty response from API, retrying with simpler request...');
      // Retry once with a simpler prompt
      const retryResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { 
          parts: [
            imagePart,
            { text: `Generate ${messageCount} short chat messages for this New World screenshot. Return JSON with format: {\"chatMessages\":[{\"message\":\"text\"}]}. Use only letters and spaces.` }
          ] 
        },
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 500,
        }
      });
      const retryJsonString = retryResult.text?.trim() || '';
      if (!retryJsonString) {
        throw new Error("Empty response received from API after retry.");
      }
      // Use the retry result
      try {
        const retryJson = JSON.parse(retryJsonString) as ApiResponse;
        if (retryJson.chatMessages && retryJson.chatMessages.length > 0) {
          console.log('Retry successful, got', retryJson.chatMessages.length, 'messages');
          // Apply same sanitization
          retryJson.chatMessages = retryJson.chatMessages
            .map(item => ({
              message: item.message.replace(/[^a-zA-Z\s]/g, '').trim()
            }))
            .filter(item => item.message.length > 0);
          return retryJson;
        }
      } catch (retryParseError) {
        console.error('Retry parse error:', retryParseError);
      }
      throw new Error("Empty response received from API.");
    }
    let parsedResponse: ApiResponse;
    try {
      parsedResponse = JSON.parse(jsonString) as ApiResponse;
    } catch (parseError) {
      throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }
    if (!parsedResponse.chatMessages || !Array.isArray(parsedResponse.chatMessages)) {
      throw new Error("Invalid response format from API. Expected 'chatMessages' array.");
    }
    if (parsedResponse.chatMessages.length === 0) {
      throw new Error("No chat messages generated. Please try again.");
    }
    // Further sanitize to ensure the API followed the rules and filter out empty messages
    parsedResponse.chatMessages = parsedResponse.chatMessages
      .map(item => ({
        message: item.message.replace(/[^a-zA-Z\s]/g, '').trim()
      }))
      .filter(item => item.message.length > 0);
    if (parsedResponse.chatMessages.length === 0) {
      throw new Error("All generated messages were invalid. Please try again.");
    }
    console.log('Successfully generated', parsedResponse.chatMessages.length, 'chat messages');
    // Save the last used messageCount for further generations
    (generateChatResponses as any).lastMessageCount = messageCount;
    return parsedResponse;
  } catch (error) {
    console.error("Error generating chat responses:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate responses: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating responses.");
  }
};