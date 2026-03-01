import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { db } from '../models/database.js';
import { logAudit } from './auditService.js';

if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY not configured.");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export const wasteModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
});

import { safeRun } from '../models/database.js';

const updateMetrics = async (rejection = false, confidence = 0) => {
    try {
        await safeRun(`UPDATE SystemMetrics SET metricValue = metricValue + 1 WHERE metricKey = 'totalAISubmissions'`);
        if (rejection) {
            await safeRun(`UPDATE SystemMetrics SET metricValue = metricValue + 1 WHERE metricKey = 'totalAIRejections'`);
        }
        if (confidence > 0) {
            await safeRun(`UPDATE SystemMetrics SET metricValue = metricValue + ? WHERE metricKey = 'totalConfidenceSum'`, [confidence]);
        }
    } catch (err) {
        console.error('[METRICS ERROR]', err.message);
    }
};

const analyzeWasteImageWithAI = async (fileBuffer, originalName) => {
    try {
        // 8. IMAGE OPTIMIZATION: Resize and Compress before AI call
        const optimizedBuffer = await sharp(fileBuffer)
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        const prompt = `
            Analyze this image. You MUST return ONLY a raw JSON mapping with no markdown formatting or extra text.
            The JSON must match this structure exactly:
            {
                "isWaste": boolean,
                "wasteType": string, // One of: "Dry Waste", "Wet Waste", "E-Waste", "Hazardous"
                "confidenceScore": number // 0-100
            }
        `;

        const imageParts = [
            {
                inlineData: {
                    data: optimizedBuffer.toString("base64"),
                    mimeType: 'image/jpeg'
                },
            },
        ];

        // 7. STRICT AI SANDBOX: 10 second timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI connection timed out after 10 seconds.")), 10000)
        );

        const aiCallPromise = wasteModel.generateContent([prompt, ...imageParts]);
        const result = await Promise.race([aiCallPromise, timeoutPromise]);
        let responseText = result.response.text();
        responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(responseText);
        } catch (e) {
            updateMetrics(true);
            throw new Error("AI returned malformed JSON payload.");
        }

        // Strict validation
        if (typeof parsedData.isWaste !== 'boolean' || typeof parsedData.confidenceScore !== 'number') {
            updateMetrics(true);
            throw new Error("Invalid AI response structure.");
        }

        if (parsedData.confidenceScore < 70) {
            updateMetrics(true);
            logAudit({ actionType: 'AI_REJECTION', metadata: { reason: 'low_confidence', score: parsedData.confidenceScore } });
            throw new Error(`AI confidence too low (${parsedData.confidenceScore}%).`);
        }

        updateMetrics(false, parsedData.confidenceScore);

        if (parsedData.isWaste) {
            const typeStr = (parsedData.wasteType || "").toLowerCase();
            let normCategory = null;

            if (/(plastic|paper|dry waste|recyclable)/.test(typeStr)) normCategory = "Dry Waste";
            else if (/(organic|food|wet|biodegradable)/.test(typeStr)) normCategory = "Wet Waste";
            else if (/(electronic|battery|device|e waste)/.test(typeStr)) normCategory = "E-Waste";
            else if (/(chemical|toxic|medical|hazard)/.test(typeStr)) normCategory = "Hazardous";

            if (!normCategory) {
                logAudit({ actionType: 'AI_REJECTION', metadata: { reason: 'unmappable_category', original: typeStr } });
                throw new Error(`Unknown waste category detected: ${typeStr}`);
            }

            parsedData.wasteType = normCategory;
        } else {
            logAudit({ actionType: 'AI_REJECTION', metadata: { reason: 'not_waste' } });
            throw new Error("Image does not appear to contain valid waste.");
        }

        return parsedData;
    } catch (error) {
        console.error("Gemini AI Error:", error.message);
        throw new Error(error.message || "AI service failure.");
    }
};

export { analyzeWasteImageWithAI };
