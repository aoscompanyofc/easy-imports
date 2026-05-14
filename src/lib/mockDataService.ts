import { getStorage, setStorage, removeStorage } from './storage';

// Helper to manage local storage data
const getCollection = (key: string) => getStorage<any[]>(`easy_imports_${key}`, []);
const saveCollection = (key: string, data: any[]) => setStorage(`easy_imports_${key}`, data);

export const mockDataService = {
  // System Maintenance
  async clearAllData() {
    const keys = [
      'easy_imports_products',
      'easy_imports_sales',
      'easy_imports_customers',
      'easy_imports_leads',
      'easy_imports_transactions',
      'easy_imports_suppliers',
      'easy_imports_campaigns',
      'easy_imports_documents'
    ];
    keys.forEach(key => removeStorage(key));
    return true;
  },

  // Products
  async getProducts() {
    return getCollection('products');
  },
  async addProduct(product: any) {
    const data = getCollection('products');
    const newProduct = { ...product, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    saveCollection('products', [newProduct, ...data]);
    return newProduct;
  },
  async updateProduct(id: string, updates: any) {
    const data = getCollection('products');
    const updated = data.map(p => p.id === id ? { ...p, ...updates } : p);
    saveCollection('products', updated);
    return updated.find(p => p.id === id);
  },
  async deleteProduct(id: string) {
    const data = getCollection('products');
    const updated = data.filter(p => p.id !== id);
    saveCollection('products', updated);
    return true;
  },

  // Sales
  async getSales() {
    const sales = getCollection('sales');
    const customers = getCollection('customers');
    return sales.map(s => ({
      ...s,
      customers: customers.find(c => c.id === s.customer_id)
    }));
  },
  async addSale(sale: any, items: any[]) {
    const sales = getCollection('sales');
    const newSale = { ...sale, id: crypto.randomUUID(), created_at: sale.created_at || new Date().toISOString() };
    saveCollection('sales', [newSale, ...sales]);
    
    const products = getCollection('products');
    for (const item of items) {
      const prodIdx = products.findIndex(p => p.id === item.product_id);
      let costPrice = 0;
      if (prodIdx > -1) {
        costPrice = products[prodIdx].purchase_price || 0;
        products[prodIdx].stock_quantity -= item.quantity;
        products[prodIdx].status = products[prodIdx].stock_quantity <= 0 ? 'out_of_stock' : 'available';
      }
      
      // Revenue Transaction
      await this.addTransaction({
        description: `Venda #${newSale.id.slice(0,8)}`,
        amount: item.unit_price * item.quantity,
        type: 'income',
        category: 'sale',
        date: newSale.created_at
      });

      // Cost of Goods Sold (COGS) Transaction - for profit calculation
      if (costPrice > 0) {
        await this.addTransaction({
          description: `Custo Mercadoria #${newSale.id.slice(0,8)}`,
          amount: costPrice * item.quantity,
          type: 'expense',
          category: 'stock',
          date: newSale.created_at
        });
      }
    }
    saveCollection('products', products);
    return newSale;
  },
  async deleteSale(id: string) {
    const data = getCollection('sales');
    const updated = data.filter(s => s.id !== id);
    saveCollection('sales', updated);
    return true;
  },

  // Customers
  async getCustomers() {
    return getCollection('customers');
  },
  async addCustomer(customer: any) {
    const data = getCollection('customers');
    const newCustomer = { ...customer, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    saveCollection('customers', [newCustomer, ...data]);
    return newCustomer;
  },
  async deleteCustomer(id: string) {
    const data = getCollection('customers');
    const updated = data.filter(c => c.id !== id);
    saveCollection('customers', updated);
    return true;
  },

  // Leads
  async getLeads() {
    return getCollection('leads');
  },
  async addLead(lead: any) {
    const data = getCollection('leads');
    const newLead = { ...lead, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    saveCollection('leads', [newLead, ...data]);
    return newLead;
  },
  async updateLead(id: string, updates: any) {
    const data = getCollection('leads');
    const updated = data.map(l => l.id === id ? { ...l, ...updates } : l);
    saveCollection('leads', updated);
    return updated.find(l => l.id === id);
  },
  async deleteLead(id: string) {
    const data = getCollection('leads');
    const updated = data.filter(l => l.id !== id);
    saveCollection('leads', updated);
    return true;
  },

  // Transactions
  async getTransactions() {
    return getCollection('transactions');
  },
  async addTransaction(transaction: any) {
    const data = getCollection('transactions');
    const newTransaction = { ...transaction, id: crypto.randomUUID(), created_at: new Date().toISOString(), date: transaction.date || new Date().toISOString() };
    saveCollection('transactions', [newTransaction, ...data]);
    return newTransaction;
  },
  async deleteTransaction(id: string) {
    const data = getCollection('transactions');
    const updated = data.filter(t => t.id !== id);
    saveCollection('transactions', updated);
    return true;
  },

  // Suppliers
  async getSuppliers() {
    return getCollection('suppliers');
  },
  async addSupplier(supplier: any) {
    const data = getCollection('suppliers');
    const newSupplier = { ...supplier, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    saveCollection('suppliers', [newSupplier, ...data]);
    return newSupplier;
  },

  // Campaigns
  async getCampaigns() {
    return getCollection('campaigns');
  },
  async addCampaign(campaign: any) {
    const data = getCollection('campaigns');
    const newCampaign = { ...campaign, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    saveCollection('campaigns', [newCampaign, ...data]);
    return newCampaign;
  },
  async updateCampaign(id: string, updates: any) {
    const data = getCollection('campaigns');
    const updated = data.map(c => c.id === id ? { ...c, ...updates } : c);
    saveCollection('campaigns', updated);
    return updated.find(c => c.id === id);
  },
  async deleteCampaign(id: string) {
    const data = getCollection('campaigns');
    const updated = data.filter(c => c.id !== id);
    saveCollection('campaigns', updated);
    return true;
  },

  // Documents
  async getDocuments() {
    return getCollection('documents');
  },
  async addDocument(document: any) {
    const data = getCollection('documents');
    const newDoc = { ...document, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    saveCollection('documents', [newDoc, ...data]);
    return newDoc;
  }
};
