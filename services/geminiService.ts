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
const convertImageURLToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Validate image size (max 20MB)
    if (blob.size > 20 * 1024 * 1024) {
      throw new Error('Image file is too large. Please use an image smaller than 20MB.');
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          if (base64String) {
            resolve(base64String);
          } else {
            reject(new Error('Could not extract base64 string from data URL.'));
          }
        } else {
          reject(new Error('Failed to read blob as a data URL.'));
        }
      };
      reader.onerror = (error) => reject(new Error(`FileReader error: ${error}`));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
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
    const ai = getAIInstance();
    const base64ImageData = await convertImageURLToBase64(imageUrl);

    // Determine MIME type from the original URL/blob
    const response = await fetch(imageUrl);
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    const imagePart = {
      inlineData: {
        mimeType: contentType,
        data: base64ImageData,
      },
    };

    const basePrompt = "You are a hilarious AI assistant for the MMORPG New World. Your task is to generate funny, context-aware chat messages full of stupid jokes that a player could use. Based on the provided screenshot, generate 5 distinct chat messages. The messages should sound like a real player who isn't very serious and loves to joke around.";
    
    const funnyPrompt = "You are an absolutely UNHINGED AI comedian for the MMORPG New World. Your goal is to generate the most absurd, nonsensical, and stupidly funny chat messages imaginable based on the screenshot. Go completely over the top. Think chaotic goblin energy. The player wants to spam chat with pure nonsense.";
    
    const punctuationRule = " CRUCIAL RULE: Every message you generate must not contain any special characters or punctuation. This means no commas, periods, apostrophes, quotation marks, hyphens, etc. Only use letters and spaces.";

    const promptText = (isFunnier ? funnyPrompt : basePrompt) + punctuationRule;

    const textPart = {
      text: promptText
    };

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

    return parsedResponse;

  } catch (error) {
    console.error("Error generating chat responses:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate responses: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating responses.");
  }
};