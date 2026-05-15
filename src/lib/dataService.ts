import { supabase } from './supabase';
import { mockDataService } from './mockDataService';

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && url !== 'YOUR_SUPABASE_URL' && url.includes('supabase.co') && key && key !== 'YOUR_SUPABASE_ANON_KEY';
};

const useMock = !isSupabaseConfigured();

// Schema-cache / missing-column error — same pattern used everywhere
const isColErr = (e: any) =>
  e?.code === '42703' ||
  e?.message?.includes('schema cache') ||
  e?.message?.includes('Could not find');

// Try each payload in order; move to next on column error, throw on any other error
async function tryInsert(table: string, payloads: Record<string, any>[]) {
  for (const payload of payloads) {
    const { data, error } = await supabase.from(table).insert([payload]).select();
    if (!error) return data![0];
    if (!isColErr(error)) throw error;
  }
  throw new Error(`Erro ao inserir em ${table}. Verifique as colunas no Supabase.`);
}

// Usa getSession() (cache local, sem chamada de rede extra)
async function getUid(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  throw new Error('Sessão expirada. Faça logout e login novamente.');
}

export const dataService = {
  async clearAllData() {
    if (useMock) return mockDataService.clearAllData();
    const uid = await getUid();
    await supabase.from('sale_items').delete().eq('user_id', uid);
    await supabase.from('sales').delete().eq('user_id', uid);
    await supabase.from('products').delete().eq('user_id', uid);
    await supabase.from('customers').delete().eq('user_id', uid);
    await supabase.from('leads').delete().eq('user_id', uid);
    await supabase.from('transactions').delete().eq('user_id', uid);
    return true;
  },

  // ─── Products ────────────────────────────────────────────────────────
  async getProducts() {
    if (useMock) return mockDataService.getProducts();
    const { data, error } = await supabase
      .from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addProduct(product: any) {
    if (useMock) return mockDataService.addProduct(product);
    const uid = await getUid();
    const { name, category, purchase_price, sale_price, stock_quantity, status,
      imei, supplier_id, product_capacity, product_color, product_condition } = product;
    const base = { name, category, purchase_price, sale_price: sale_price || 0, stock_quantity, status, user_id: uid };
    return tryInsert('products', [
      { ...base, imei, supplier_id, product_capacity, product_color, product_condition },
      { ...base, imei, supplier_id },
      { ...base, imei },
      base,
    ]);
  },
  async updateProduct(id: string, updates: any) {
    if (useMock) return mockDataService.updateProduct(id, updates);
    const { name, category, purchase_price, sale_price, stock_quantity, status,
      imei, product_capacity, product_color, product_condition, supplier_id } = updates;
    const payload: any = { name, category, purchase_price, sale_price: sale_price || 0, stock_quantity, status };
    if (imei !== undefined) payload.imei = imei;
    if (product_capacity !== undefined) payload.product_capacity = product_capacity;
    if (product_color !== undefined) payload.product_color = product_color;
    if (product_condition !== undefined) payload.product_condition = product_condition;
    if (supplier_id !== undefined) payload.supplier_id = supplier_id;
    const { data, error } = await supabase
      .from('products').update(payload).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  async deleteProduct(id: string) {
    if (useMock) return mockDataService.deleteProduct(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── Sales ───────────────────────────────────────────────────────────
  async getSales() {
    if (useMock) return mockDataService.getSales();
    const { data, error } = await supabase
      .from('sales').select('*, customers(name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addSale(sale: any, items: any[]) {
    if (useMock) return mockDataService.addSale(sale, items);
    const uid = await getUid();
    const {
      customer_id, customer_name, product_name, total_amount, payment_method, status, created_at,
      sale_number, sale_type, installments,
      seller_name, seller_cpf, seller_rg, seller_phone, seller_address, seller_email,
      customer_phone, customer_cpf,
      product_capacity, product_color, product_condition, product_imei, product_accessories,
    } = sale;
    const sign_token = crypto.randomUUID();
    const fullPayload = {
      customer_id, customer_name, product_name, total_amount, payment_method, status, created_at,
      sale_number, sale_type, installments: installments || 1, sign_token,
      seller_name, seller_cpf, seller_rg, seller_phone, seller_address, seller_email,
      customer_phone, customer_cpf,
      product_capacity, product_color, product_condition, product_imei, product_accessories,
      user_id: uid,
    };
    const isColumnError = (e: any) =>
      e?.code === '42703' ||
      e?.message?.includes('schema cache') ||
      e?.message?.includes('Could not find');

    let saleData: any[], saleError: any;
    try {
      const res = await supabase.from('sales').insert([fullPayload]).select();
      saleData = res.data || [];
      saleError = res.error;
      if (isColumnError(saleError)) {
        // Fallback to basic schema if extra columns don't exist yet
        const res2 = await supabase.from('sales')
          .insert([{ customer_id, customer_name, product_name, total_amount, payment_method, status, created_at, user_id: uid }])
          .select();
        saleData = res2.data || [];
        saleError = res2.error;
      }
    } catch (e) {
      throw e;
    }
    if (saleError) throw saleError;
    const saleId = saleData[0].id;
    for (const item of items) {
      await supabase.from('sale_items').insert([{ ...item, sale_id: saleId, user_id: uid }]);
      const { data: product } = await supabase
        .from('products').select('stock_quantity, purchase_price').eq('id', item.product_id).single();
      if (product) {
        const newQty = product.stock_quantity - item.quantity;
        const { data: updatedRows } = await supabase.from('products')
          .update({ stock_quantity: newQty, status: newQty <= 0 ? 'out_of_stock' : 'available' })
          .eq('id', item.product_id)
          .eq('stock_quantity', product.stock_quantity) // optimistic lock — prevents double-sell race
          .select('id');
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error('Produto já foi vendido ou o estoque mudou. Recarregue a página e tente novamente.');
        }
        if (product.purchase_price > 0) {
          await this.addTransaction({
            description: `Custo Mercadoria #${saleId.slice(0, 8)}`,
            amount: product.purchase_price * item.quantity,
            type: 'expense', category: 'stock',
            date: created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          });
        }
      }
      await this.addTransaction({
        description: `Venda #${saleId.slice(0, 8)}`,
        amount: item.unit_price * item.quantity,
        type: 'income', category: 'sale',
        date: created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      });
    }
    return saleData[0];
  },
  async deleteSale(id: string) {
    if (useMock) return mockDataService.deleteSale(id);
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── Customers ───────────────────────────────────────────────────────
  async getCustomers() {
    if (useMock) return mockDataService.getCustomers();
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return data;
  },
  async addCustomer(customer: any) {
    if (useMock) return mockDataService.addCustomer(customer);
    const uid = await getUid();
    const { name, email, phone } = customer;
    return tryInsert('customers', [
      { name, email, phone, user_id: uid },
      { name, phone, user_id: uid },
      { name, user_id: uid },
    ]);
  },
  async deleteCustomer(id: string) {
    if (useMock) return mockDataService.deleteCustomer(id);
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── Leads ───────────────────────────────────────────────────────────
  async getLeads() {
    if (useMock) return mockDataService.getLeads();
    const { data, error } = await supabase
      .from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addLead(lead: any) {
    if (useMock) return mockDataService.addLead(lead);
    const uid = await getUid();
    const { name, phone, email, source, notes, status } = lead;
    return tryInsert('leads', [
      { name, phone, email, source, notes, status, user_id: uid },
      { name, phone, email, status, user_id: uid },
      { name, phone, user_id: uid },
    ]);
  },
  async updateLead(id: string, updates: any) {
    if (useMock) return mockDataService.updateLead(id, updates);
    const { data, error } = await supabase
      .from('leads').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  async deleteLead(id: string) {
    if (useMock) return mockDataService.deleteLead(id);
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── Transactions ────────────────────────────────────────────────────
  async getTransactions() {
    if (useMock) return mockDataService.getTransactions();
    const { data, error } = await supabase
      .from('transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addTransaction(transaction: any) {
    if (useMock) return mockDataService.addTransaction(transaction);
    const uid = await getUid();
    const { description, amount, type, category, date } = transaction;
    return tryInsert('transactions', [
      { description, amount, type, category, date, user_id: uid },
      { description, amount, type, date, user_id: uid },
      { description, amount, type, user_id: uid },
    ]);
  },
  async deleteTransaction(id: string) {
    if (useMock) return mockDataService.deleteTransaction(id);
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── Suppliers ───────────────────────────────────────────────────────
  async getSuppliers() {
    if (useMock) return mockDataService.getSuppliers();
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (error) throw error;
    return data;
  },
  async addSupplier(supplier: any) {
    if (useMock) return mockDataService.addSupplier(supplier);
    const uid = await getUid();
    const { name, contact_name, email, phone, category, country } = supplier;
    return tryInsert('suppliers', [
      { name, contact_name, email, phone, category, country, user_id: uid },
      { name, contact_name, phone, country, user_id: uid },
      { name, phone, country, user_id: uid },
      { name, user_id: uid },
    ]);
  },
  async deleteSupplier(id: string) {
    if (useMock) return true;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── Campaigns ───────────────────────────────────────────────────────
  async getCampaigns() {
    if (useMock) return mockDataService.getCampaigns();
    const { data, error } = await supabase
      .from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addCampaign(campaign: any) {
    if (useMock) return mockDataService.addCampaign(campaign);
    const uid = await getUid();
    const { name, platform, budget, spent, leads_count, status, start_date,
            description, objective, end_date, results_text, target_audience } = campaign;
    const fullPayload = { name, platform, budget, spent, leads_count, status, start_date,
      description, objective, end_date, results_text, target_audience, user_id: uid };
    try {
      const { data, error } = await supabase.from('campaigns').insert([fullPayload]).select();
      if (error) throw error;
      return data[0];
    } catch (e: any) {
      if (e?.code === '42703') {
        // Extra columns don't exist yet — fallback to basic schema
        const { data, error } = await supabase
          .from('campaigns')
          .insert([{ name, platform, budget, spent, leads_count, status, start_date, user_id: uid }])
          .select();
        if (error) throw error;
        return data[0];
      }
      throw e;
    }
  },
  async updateCampaign(id: string, updates: any) {
    if (useMock) return mockDataService.updateCampaign(id, updates);
    const { data, error } = await supabase
      .from('campaigns').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  async deleteCampaign(id: string) {
    if (useMock) return mockDataService.deleteCampaign(id);
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── Team Members ─────────────────────────────────────────────────────
  async getTeamMembers() {
    const uid = await getUid();
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async addTeamMember(member: { name: string; email: string; role: string; allowed_pages: string[] }) {
    const uid = await getUid();
    const { data, error } = await supabase
      .from('team_members')
      .insert([{ ...member, owner_id: uid }])
      .select();
    if (error) throw error;
    return data[0];
  },
  async deleteTeamMember(id: string) {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ─── User Profile (synced across devices) ────────────────────────────
  async getProfile() {
    if (useMock) return null;
    const uid = await getUid();
    const { data } = await supabase
      .from('user_profiles').select('*').eq('id', uid).maybeSingle();
    return data;
  },
  async upsertProfile(profile: { name?: string; cargo?: string; telefone?: string; avatar?: string; cnpj?: string }) {
    if (useMock) return;
    const uid = await getUid();
    const { error } = await supabase.from('user_profiles').upsert(
      { id: uid, ...profile, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    if (error && !error.message?.includes('does not exist') && error.code !== '42P01') throw error;
  },

  // ─── Documents ───────────────────────────────────────────────────────
  async getDocuments() {
    if (useMock) return mockDataService.getDocuments();
    const { data, error } = await supabase
      .from('documents').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addDocument(document: any) {
    if (useMock) return mockDataService.addDocument(document);
    const uid = await getUid();
    const { title, category, file_url } = document;
    const { data, error } = await supabase
      .from('documents')
      .insert([{ title, category, file_url, user_id: uid }])
      .select();
    if (error) throw error;
    return data[0];
  },
  async deleteDocument(id: string) {
    if (useMock) return mockDataService.deleteDocument(id);
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
