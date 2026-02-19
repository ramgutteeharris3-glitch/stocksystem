
import { InventoryItem, AIInsight, Category } from "../types";

/**
 * Local intelligence service that runs without network connectivity.
 * Replaces remote Gemini API calls with local analytical logic.
 */

export const analyzeInventory = async (items: InventoryItem[]): Promise<AIInsight[]> => {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn("Backend AI unreachable, falling back to local analysis", e);
  }

  // Local Fallback Logic (Offline)
  const insights: AIInsight[] = [];
  
  // 1. Check for Low Stock
  const lowStockItems = items.filter(i => {
    const total = Object.values(i.stocks).reduce((a, b) => a + b, 0);
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
    const total = Object.values(i.stocks).reduce((a, b) => a + b, 0);
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
  const avgShopsPerItem = items.reduce((acc, i) => acc + Object.keys(i.stocks).length, 0) / items.length;
  if (avgShopsPerItem < 2) {
    insights.push({
      title: "Logistic Opportunity",
      content: "Most items are concentrated in single locations. Consider inter-shop transfers to optimize regional availability.",
      type: 'info'
    });
  } else {
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
  const templates = [
    `Premium quality ${itemName} designed for durability and high performance in everyday use.`,
    `The latest ${itemName} featuring modern aesthetics and reliable functionality for professional environments.`,
    `Top-tier ${itemName} offering exceptional value and craftsmanship for demanding users.`
  ];
  const idx = itemName.length % templates.length;
  return templates[idx];
};
