import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

console.log("Key:", process.env.GOOGLE_AI_API_KEY.substring(0, 10));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_API_KEY}`);
    const data = await response.json();
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } catch (e) {
    console.error(e);
  }
}

listModels();
