// backend/services/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Make sure your .env file has GEMINI_API_KEY="YOUR_KEY"
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Takes a string of text and returns its vector embedding.
 * @param {string} text The text to embed.
 * @returns {Promise<number[]>} A promise that resolves to an array of numbers (the embedding).
 */
async function generateEmbedding(text) {
  try {
    // We use the embedding-001 model for this task
    // console.log("gemini.js working");
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    // console.log("result", result);
    const embedding = result.embedding;
    // console.log("embedidng", embedding);
    return embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding from Gemini API.");
  }
}

module.exports = { generateEmbedding };
