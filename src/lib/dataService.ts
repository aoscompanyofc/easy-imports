import { supabase } from './supabase';
import { mockDataService } from './mockDataService';

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && url !== 'YOUR_SUPABASE_URL' && url.includes('supabase.co') && key && key !== 'YOUR_SUPABASE_ANON_KEY';
};

const useMock = !isSupabaseConfigured();

export const dataService = {
  async clearAllData() {
    if (useMock) return mockDataService.clearAllData();
    return true;
  },

  // Products
  async getProducts() {
    if (useMock) return mockDataService.getProducts();
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addProduct(product: any) {
    if (useMock) return mockDataService.addProduct(product);
    const { name, category, purchase_price, sale_price, stock_quantity, status } = product;
    const { data, error } = await supabase.from('products').insert([{ name, category, purchase_price, sale_price, stock_quantity, status }]).select();
    if (error) throw error;
    return data[0];
  },
  async updateProduct(id: string, updates: any) {
    if (useMock) return mockDataService.updateProduct(id, updates);
    const { name, category, purchase_price, sale_price, stock_quantity, status } = updates;
    const { data, error } = await supabase.from('products').update({ name, category, purchase_price, sale_price, stock_quantity, status }).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  async deleteProduct(id: string) {
    if (useMock) return mockDataService.deleteProduct(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Sales
  async getSales() {
    if (useMock) return mockDataService.getSales();
    const { data, error } = await supabase.from('sales').select('*, customers(name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addSale(sale: any, items: any[]) {
    if (useMock) return mockDataService.addSale(sale, items);
    const { data: saleData, error: saleError } = await supabase.from('sales').insert([sale]).select();
    if (saleError) throw saleError;
    const saleId = saleData[0].id;
    for (const item of items) {
      await supabase.from('sale_items').insert([{ ...item, sale_id: saleId }]);
      const { data: product } = await supabase.from('products').select('stock_quantity, purchase_price').eq('id', item.product_id).single();
      if (product) {
        const newQuantity = product.stock_quantity - item.quantity;
        await supabase.from('products').update({ stock_quantity: newQuantity, status: newQuantity <= 0 ? 'out_of_stock' : 'available' }).eq('id', item.product_id);
        if (product.purchase_price > 0) {
          await this.addTransaction({ description: `Custo Mercadoria #${saleId.slice(0,8)}`, amount: product.purchase_price * item.quantity, type: 'expense', category: 'stock', date: sale.created_at || new Date().toISOString() });
        }
      }
      await this.addTransaction({ description: `Venda #${saleId.slice(0,8)}`, amount: item.unit_price * item.quantity, type: 'income', category: 'sale', date: sale.created_at || new Date().toISOString() });
    }
    return saleData[0];
  },
  async deleteSale(id: string) {
    if (useMock) return mockDataService.deleteSale(id);
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Customers
  async getCustomers() {
    if (useMock) return mockDataService.getCustomers();
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return data;
  },
  async addCustomer(customer: any) {
    if (useMock) return mockDataService.addCustomer(customer);
    const { data, error } = await supabase.from('customers').insert([customer]).select();
    if (error) throw error;
    return data[0];
  },
  async deleteCustomer(id: string) {
    if (useMock) return mockDataService.deleteCustomer(id);
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Leads
  async getLeads() {
    if (useMock) return mockDataService.getLeads();
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addLead(lead: any) {
    if (useMock) return mockDataService.addLead(lead);
    const { data, error } = await supabase.from('leads').insert([lead]).select();
    if (error) throw error;
    return data[0];
  },
  async updateLead(id: string, updates: any) {
    if (useMock) return mockDataService.updateLead(id, updates);
    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  async deleteLead(id: string) {
    if (useMock) return mockDataService.deleteLead(id);
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Transactions
  async getTransactions() {
    if (useMock) return mockDataService.getTransactions();
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addTransaction(transaction: any) {
    if (useMock) return mockDataService.addTransaction(transaction);
    const { data, error } = await supabase.from('transactions').insert([transaction]).select();
    if (error) throw error;
    return data[0];
  },
  async deleteTransaction(id: string) {
    if (useMock) return mockDataService.deleteTransaction(id);
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Suppliers
  async getSuppliers() {
    if (useMock) return mockDataService.getSuppliers();
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (error) throw error;
    return data;
  },
  async addSupplier(supplier: any) {
    if (useMock) return mockDataService.addSupplier(supplier);
    const { data, error } = await supabase.from('suppliers').insert([supplier]).select();
    if (error) throw error;
    return data[0];
  },

  // Campaigns
  async getCampaigns() {
    if (useMock) return mockDataService.getCampaigns();
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addCampaign(campaign: any) {
    if (useMock) return mockDataService.addCampaign(campaign);
    const { data, error } = await supabase.from('campaigns').insert([campaign]).select();
    if (error) throw error;
    return data[0];
  },
  async updateCampaign(id: string, updates: any) {
    if (useMock) return mockDataService.updateCampaign(id, updates);
    const { data, error } = await supabase.from('campaigns').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  async deleteCampaign(id: string) {
    if (useMock) return mockDataService.deleteCampaign(id);
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Documents
  async getDocuments() {
    if (useMock) return mockDataService.getDocuments();
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addDocument(document: any) {
    if (useMock) return mockDataService.addDocument(document);
    const { data, error } = await supabase.from('documents').insert([document]).select();
    if (error) throw error;
    return data[0];
  },
  async deleteDocument(id: string) {
    if (useMock) return mockDataService.deleteDocument(id);
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
