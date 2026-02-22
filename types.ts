
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stocks: Record<string, number>; // Key: Shop Name, Value: Quantity
  quantity?: number; // Used for transient calculations and bulk imports
  minQuantity: number;
  price: number;
  promoPrice?: number;
  offers?: string;
  lastUpdated: string;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  lastVisit: string;
  totalSpent: number;
}

export interface TransactionItem {
  itemId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  promoPrice?: number;
  offers?: string;
  model?: string;
  brand?: string;
  invoiceNo?: string;
  parentId?: string;
}

export type DocumentType = 'RECEIPT' | 'DELIVERY_NOTE' | 'WAREHOUSE_TRANSFER' | 'VAT_REFUND';

export interface Transaction {
  id: string;
  type: DocumentType;
  receiptNumber: string;
  invoiceNumber: string;
  deliveryNoteNumber?: string;
  transferNoteNumber?: string;
  date: string;
  shop: string;
  toShop?: string;
  salesperson: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerPhone?: string;
  items: TransactionItem[];
  subtotal: number;
  total: number;
  discount: number;
  paymentMethod: string;
  paymentReference?: string;
  footerNote?: string;
  visitor?: {
    surname: string;
    otherNames: string;
    passportNo: string;
    nationality: string;
    dateOfIssue: string;
    dateOfExpiry: string;
    flightNo: string;
    departureDate: string;
    permanentAddress?: string;
  };
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  shop: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  date: string;
  referenceId?: string;
  note?: string;
}

export enum Category {
  ELECTRONICS = 'Electronics',
  FURNITURE = 'Furniture',
  OFFICE = 'Office Supplies',
  KITCHEN = 'Kitchenware',
  OTHER = 'Other'
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  categoryDistribution: { name: string; value: number }[];
}

export interface AIInsight {
  title: string;
  content: string;
  type: 'warning' | 'info' | 'success';
}

export const SHOPS = [
  'Global',
  'Master',
  'Plouis',
  'Bagatelle',
  'Tribecca',
  'Trianon',
  'Rhill',
  'Cascavelle',
  'Rosebelle'
] as const;

export type ShopName = typeof SHOPS[number];
