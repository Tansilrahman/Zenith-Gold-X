import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

console.log("Key:", process.env.GOOGLE_AI_API_KEY.substring(0, 10));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function test() {
    try {
        const result = await model.generateContent("hello");
        console.log("Success:", result.response.text());
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
