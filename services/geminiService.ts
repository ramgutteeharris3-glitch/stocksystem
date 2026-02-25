
import { GoogleGenAI } from "@google/genai";
import { InventoryItem, AIInsight, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Local intelligence service that runs without network connectivity.
 * Replaces remote Gemini API calls with local analytical logic.
 */
export const analyzeInventory = async (items: InventoryItem[]): Promise<AIInsight[]> => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze this inventory data and provide 3 actionable insights.
      Data: ${JSON.stringify(items.map((i: any) => ({ 
        name: i.name, 
        stocks: i.stocks, 
        price: i.price, 
        min: i.minQuantity,
        promo: i.promoPrice,
        offers: i.offers
      })))}
      
      Return the response as a JSON array of objects with this structure:
      [{ "title": "string", "content": "string", "type": "warning" | "info" | "success" }]
    `;

    const result = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = result.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (e) {
    console.warn("Gemini AI error, falling back to local analysis", e);
  }

  // Local Fallback Logic (Offline)
  const insights: AIInsight[] = [];
  
  // 1. Check for Low Stock
  const lowStockItems = items.filter(i => {
    const total = Object.values(i.stocks || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    return total <= i.minQuantity;
  });

  if (lowStockItems.length > 0) {
    insights.push({
      title: "Stock Depletion Alert",
      content: `${lowStockItems.length} product(s) are at or below critical minimum levels. Prioritize restock for ${lowStockItems[0].name}.`,
      type: 'warning'
    });
  }

  // 2. Identify Highest Value Category
  const catValues: Record<string, number> = {};
  items.forEach(i => {
    const total = Object.values(i.stocks || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    catValues[i.category] = (catValues[i.category] || 0) + (total * i.price);
  });

  const topCategory = Object.entries(catValues).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push({
      title: "Inventory Concentration",
      content: `The ${topCategory[0]} category represents your largest capital investment (MUR ${topCategory[1].toLocaleString()}).`,
      type: 'success'
    });
  }

  // 3. Distribution Insight
  const avgShopsPerItem = items.length > 0 ? items.reduce((acc, i) => acc + Object.keys(i.stocks || {}).length, 0) / items.length : 0;
  if (avgShopsPerItem < 2 && items.length > 0) {
    insights.push({
      title: "Logistic Opportunity",
      content: "Most items are concentrated in single locations. Consider inter-shop transfers to optimize regional availability.",
      type: 'info'
    });
  } else if (items.length > 0) {
    insights.push({
      title: "Network Health",
      content: "Stock is well-distributed across your retail network. Maintain current replenishment cycle.",
      type: 'success'
    });
  }

  return insights;
};

export const parseBulkInventory = async (rawText: string): Promise<Partial<InventoryItem>[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  const items: Partial<InventoryItem>[] = [];

  lines.forEach(line => {
    // Attempt to parse CSV, TSV or Space separated values
    // Format expected: Name, SKU, Category, Qty, Price
    const parts = line.split(/[,;\t|]/).map(p => p.trim());
    
    if (parts.length >= 2) {
      const name = parts[0];
      const quantity = parseInt(parts.find(p => !isNaN(parseInt(p)) && !p.includes('.') && p.length < 5) || "0");
      const price = parseFloat(parts.find(p => !isNaN(parseFloat(p)) && p.includes('.') && p.length < 10) || "0");
      const sku = parts.find(p => p.length > 3 && isNaN(Number(p)) && p !== name) || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      items.push({
        name,
        sku,
        category: Category.OTHER,
        quantity: quantity || 1,
        price: price || 0,
        minQuantity: 5,
        description: `Imported item: ${name}`
      });
    }
  });

  return items;
};

export const generateDescription = async (itemName: string): Promise<string> => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `Generate a professional, concise product description (max 2 sentences) for an inventory item named: ${itemName}`;

    const result = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return result.text || `Premium quality ${itemName} designed for durability and high performance.`;
  } catch (e) {
    console.warn("Gemini description error:", e);
    return `Premium quality ${itemName} designed for durability and high performance.`;
  }
};

export const parseTransferNote = async (base64Image: string): Promise<{
  transferNoteNumber: string;
  date: string;
  fromShop: string;
  items: { sku: string; name: string; quantity: number; toShop: string }[];
}> => {
  try {
    const model = "gemini-3.1-pro-preview";
    
    // Detect MIME type from data URL if present
    const mimeTypeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const data = base64Image.replace(/^data:[^;]+;base64,/, "");

    const prompt = `
      Analyze this Warehouse Transfer Note document. 
      Extract the following information from the document:
      1. Transfer Note Number / Batch Reference No (e.g., WHTR12681)
      2. Date (e.g., 24/02/2026, convert to YYYY-MM-DD)
      3. Source Shop (The shop specified in the 'From Whse' or 'Source' column)
      4. List of items from the table:
         - SKU / Item Code
         - Name / Item Description
         - Quantity (The transfer quantity, usually in the 'Quantity' column)
         - Destination Shop (The shop specified in the 'To Whse' or 'Destination' column for this specific item).

      Mapping for Shop Names (if you see these abbreviations, use the full name):
      - 'Casca' or 'Casc' -> 'Cascavelle'
      - 'PL' or 'PL Branch' -> 'Plouis'
      - 'Bag' -> 'Bagatelle'
      - 'Trib' -> 'Tribecca'
      - 'Trian' -> 'Trianon'
      - 'RH' -> 'Rhill'
      - 'RB' -> 'Rosebelle'
      - 'Ars' -> 'Arsenal'
      - 'Master' -> 'Master'
      - 'Mstore' -> 'Masterstore'

      Return the response as a JSON object with this structure:
      {
        "transferNoteNumber": "string",
        "date": "string",
        "fromShop": "string",
        "items": [
          { "sku": "string", "name": "string", "quantity": number, "toShop": "string" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: data
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (text) {
      // Clean up potential markdown formatting if the model didn't strictly follow responseMimeType
      const cleanedText = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
      return JSON.parse(cleanedText);
    }
    throw new Error("No data extracted from document");
  } catch (e: any) {
    console.error("Gemini parse error:", e);
    // Provide a more descriptive error if possible
    const errorMessage = e?.message || "Unknown error during parsing";
    throw new Error(`AI Parsing Failed: ${errorMessage}`);
  }
};
