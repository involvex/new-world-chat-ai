import { GoogleGenAI, Type } from "@google/genai";
import type { ApiResponse } from '../types';

// Cache for API instance to avoid recreation
let aiInstance: GoogleGenAI | null = null;

const getAIInstance = (): GoogleGenAI => {
  if (!aiInstance) {
    if (!process.env.API_KEY) {
      throw new Error('API_KEY is not configured. Please set your Gemini API key.');
    }
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    chatMessages: {
      type: Type.ARRAY,
      description: "An array of 5 distinct chat messages.",
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
};

export const generateChatResponses = async (imageUrl: string, isFunnier: boolean = false): Promise<ApiResponse> => {
  try {
    console.log('Generating chat responses for image:', imageUrl.substring(0, 50) + '...');
    
    const ai = getAIInstance();
    const imageData = await convertImageURLToBase64(imageUrl);

    const imagePart = {
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    };

    const basePrompt = "You are a hilarious AI assistant for the MMORPG New World. Your task is to generate funny, context-aware chat messages full of stupid jokes that a player could use. Based on the provided screenshot, generate 5 distinct chat messages. The messages should sound like a real player who isn't very serious and loves to joke around.";
    
    const funnyPrompt = "You are an absolutely UNHINGED AI comedian for the MMORPG New World. Your goal is to generate the most absurd, nonsensical, and stupidly funny chat messages imaginable based on the screenshot. Go completely over the top. Think chaotic goblin energy. The player wants to spam chat with pure nonsense.";
    
    const punctuationRule = " CRUCIAL RULE: Every message you generate must not contain any special characters or punctuation. This means no commas, periods, apostrophes, quotation marks, hyphens, etc. Only use letters and spaces.";

    const promptText = (isFunnier ? funnyPrompt : basePrompt) + punctuationRule;

    const textPart = {
      text: promptText
    };

    console.log('Sending request to Gemini API...');
    
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
    return parsedResponse;

  } catch (error) {
    console.error("Error generating chat responses:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate responses: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating responses.");
  }
};