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

// Missing-table error — table was never created in Supabase
const isTableErr = (e: any) =>
  e?.code === '42P01' ||
  e?.message?.includes('does not exist') ||
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

// Same pattern for update operations
async function tryUpdate(table: string, id: string, payloads: Record<string, any>[]) {
  for (const payload of payloads) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select();
    if (!error) return data![0];
    if (!isColErr(error)) throw error;
  }
  throw new Error(`Erro ao atualizar em ${table}. Verifique as colunas no Supabase.`);
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
      imei, supplier_id, product_capacity, product_color, product_condition,
      product_warranty, product_origin, entry_date } = product;
    const base = { name, category, purchase_price, sale_price: sale_price || 0, stock_quantity, status, user_id: uid };
    return tryInsert('products', [
      { ...base, imei, supplier_id, product_capacity, product_color, product_condition, product_warranty, product_origin, entry_date },
      { ...base, imei, supplier_id, product_capacity, product_color, product_condition, product_warranty },
      { ...base, imei, supplier_id, product_capacity, product_color, product_condition },
      { ...base, imei, supplier_id },
      { ...base, imei },
      base,
    ]);
  },
  async updateProduct(id: string, updates: any) {
    if (useMock) return mockDataService.updateProduct(id, updates);
    const { name, category, purchase_price, sale_price, stock_quantity, status,
      imei, product_capacity, product_color, product_condition,
      product_warranty, product_origin, entry_date, supplier_id } = updates;
    const base: any = { name, category, purchase_price, sale_price: sale_price || 0, stock_quantity, status };
    if (imei !== undefined) base.imei = imei;
    if (supplier_id !== undefined) base.supplier_id = supplier_id;
    return tryUpdate('products', id, [
      { ...base, product_capacity, product_color, product_condition, product_warranty, product_origin, entry_date },
      { ...base, product_capacity, product_color, product_condition, product_warranty },
      { ...base, product_capacity, product_color, product_condition },
      { ...base },
    ]);
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
      .from('sales').select('*, customers(name, city, phone)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addSale(sale: any, items: any[]) {
    if (useMock) return mockDataService.addSale(sale, items);
    const uid = await getUid();
    const {
      customer_id, customer_name, product_name, total_amount, payment_method, status, created_at,
      sale_number, sale_type, installments, pdf_type,
      seller_name, seller_cpf, seller_rg, seller_phone, seller_address, seller_email,
      customer_phone, customer_cpf, customer_city,
      product_capacity, product_color, product_condition, product_imei, product_accessories,
      incoming_name, incoming_imei, incoming_serial, incoming_email,
      incoming_capacity, incoming_color, incoming_condition,
      incoming_battery_health, incoming_purchase_price,
      rep_seller_id, rep_seller_name, incoming_devices_json, installments_json,
    } = sale;
    const sign_token = crypto.randomUUID();
    const inst = installments || 1;
    const base = { customer_id, customer_name, product_name, total_amount, payment_method, status, created_at, user_id: uid };

    // Nível 1: schema completo — tudo incluindo incoming_*, pdf_type, customer_city, seller, multi-device, installments_json
    const p1 = { ...base, sale_number, sale_type, installments: inst, sign_token, pdf_type,
      seller_name, seller_cpf, seller_rg, seller_phone, seller_address, seller_email,
      customer_phone, customer_cpf, customer_city,
      product_capacity, product_color, product_condition, product_imei, product_accessories,
      incoming_name, incoming_imei, incoming_serial, incoming_email,
      incoming_capacity, incoming_color, incoming_condition, incoming_battery_health, incoming_purchase_price,
      seller_id: rep_seller_id, seller_display_name: rep_seller_name, incoming_devices_json, installments_json };

    // Nível 2: sem multi-device json e seller — mantém incoming_*, sale_type, pdf_type, customer_city
    const p2 = { ...base, sale_number, sale_type, installments: inst, sign_token, pdf_type,
      seller_name, seller_cpf, seller_rg, seller_phone, seller_address, seller_email,
      customer_phone, customer_cpf, customer_city,
      product_capacity, product_color, product_condition, product_imei, product_accessories,
      incoming_name, incoming_imei, incoming_serial, incoming_email,
      incoming_capacity, incoming_color, incoming_condition, incoming_battery_health, incoming_purchase_price,
      installments_json };

    // Nível 3: sem incoming_* e seller — mantém customer_city/cpf, sale_type e pdf_type
    const p3 = { ...base, sale_number, sale_type, installments: inst, sign_token, pdf_type,
      customer_phone, customer_cpf, customer_city,
      product_capacity, product_color, product_condition, product_imei, product_accessories,
      installments_json };

    // Nível 4: sem incoming_*, sem customer_city/cpf — mantém sale_type e pdf_type
    const p4 = { ...base, sale_number, sale_type, installments: inst, sign_token, pdf_type,
      customer_phone, product_capacity, product_color, product_condition, product_imei, product_accessories,
      installments_json };

    // Nível 5: sem colunas de produto extras — garante sale_type e sale_number
    const p5 = { ...base, sale_number, sale_type, installments: inst, sign_token, installments_json };

    // Nível 6: mínimo absoluto — pelo menos sale_type é salvo
    const p6 = { ...base, sale_type };

    const saleRow = await tryInsert('sales', [p1, p2, p3, p4, p5, p6]);
    const saleId = saleRow.id;
    const txDate = created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    for (const item of items) {
      await supabase.from('sale_items').insert([{ ...item, sale_id: saleId, user_id: uid }]);

      // Receita criada primeiro — garante que sempre vai pro Financeiro
      await this.addTransaction({
        description: `Receita ${sale_number || saleId.slice(0, 8)} — ${product_name || 'Produto'}`,
        amount: item.unit_price * item.quantity,
        type: 'income', category: 'sale',
        date: txDate,
      });

      // Atualiza estoque e cria custo (independente da receita)
      const { data: product } = await supabase
        .from('products').select('stock_quantity, purchase_price').eq('id', item.product_id).single();
      if (product) {
        const newQty = product.stock_quantity - item.quantity;
        await supabase.from('products')
          .update({ stock_quantity: newQty, status: newQty <= 0 ? 'out_of_stock' : 'available' })
          .eq('id', item.product_id)
          .eq('stock_quantity', product.stock_quantity);
        if (product.purchase_price > 0) {
          await this.addTransaction({
            description: `Custo ${sale_number || saleId.slice(0, 8)} — ${product_name || 'Produto'}`,
            amount: product.purchase_price * item.quantity,
            type: 'expense', category: 'stock',
            date: txDate,
          });
        }
      }
    }
    return saleRow;
  },
  async updateSale(id: string, updates: Record<string, any>) {
    if (useMock) throw new Error('Mock não suporta updateSale');
    const uid = await getUid();

    // Nível 1: schema completo
    const { error: e1 } = await supabase.from('sales').update(updates).eq('id', id).eq('user_id', uid);
    if (!e1) return true;
    if (!isColErr(e1)) throw e1;

    // Nível 2: sem incoming_* e pdf_type
    const lvl2 = Object.fromEntries(
      Object.entries(updates).filter(([k]) => !k.startsWith('incoming_') && k !== 'pdf_type')
    );
    const { error: e2 } = await supabase.from('sales').update(lvl2).eq('id', id).eq('user_id', uid);
    if (!e2) return true;
    if (!isColErr(e2)) throw e2;

    // Nível 3: sem colunas extras (customer_cpf, customer_city, product_condition, etc.)
    const EXTRA_COLS = ['customer_cpf','customer_city','customer_phone','product_condition',
      'product_imei','product_accessories','product_capacity','product_color'];
    const lvl3 = Object.fromEntries(
      Object.entries(lvl2).filter(([k]) => !EXTRA_COLS.includes(k))
    );
    const { error: e3 } = await supabase.from('sales').update(lvl3).eq('id', id).eq('user_id', uid);
    if (!e3) return true;
    if (!isColErr(e3)) throw e3;

    // Nível 4: mínimo absoluto — só colunas garantidas no schema base
    const minimal: Record<string, any> = {};
    for (const k of ['sale_type','customer_name','product_name','total_amount','payment_method','created_at']) {
      if (updates[k] !== undefined) minimal[k] = updates[k];
    }
    const { error: e4 } = await supabase.from('sales').update(minimal).eq('id', id).eq('user_id', uid);
    if (e4) throw e4;
    return true;
  },

  async tryUpdateSaleRevision(id: string, revision: number) {
    if (useMock) return;
    const uid = await getUid();
    const { error } = await supabase.from('sales').update({ revision }).eq('id', id).eq('user_id', uid);
    // Silently ignore column-missing errors — column needs migration
    if (error && !isColErr(error)) throw error;
  },
  async deleteSale(id: string) {
    if (useMock) return mockDataService.deleteSale(id);
    const uid = await getUid();

    // Busca sale_number antes de deletar (para limpar transações pelo número da operação)
    const { data: saleRow } = await supabase
      .from('sales').select('sale_number').eq('id', id).single();

    // Remove transações — formato novo (Receita/Custo/Aparelho Recebido #V0001 — ...)
    if (saleRow?.sale_number) {
      await supabase.from('transactions').delete()
        .like('description', `Receita ${saleRow.sale_number} —%`)
        .eq('user_id', uid);
      await supabase.from('transactions').delete()
        .like('description', `Custo ${saleRow.sale_number} —%`)
        .eq('user_id', uid);
      await supabase.from('transactions').delete()
        .like('description', `Aparelho Recebido ${saleRow.sale_number} —%`)
        .eq('user_id', uid);
    }

    // Remove transações — formato antigo (Venda #xxxxxxxx / Custo Mercadoria #xxxxxxxx)
    const prefix = id.slice(0, 8);
    await supabase.from('transactions').delete()
      .eq('description', `Venda #${prefix}`).eq('user_id', uid);
    await supabase.from('transactions').delete()
      .eq('description', `Custo Mercadoria #${prefix}`).eq('user_id', uid);

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
    const { name, email, phone, cpf, city, notes, source, birthday } = customer;
    const hasCpfCity = !!(cpf?.trim() || city?.trim());
    const base: any = { name, email, phone, user_id: uid };
    // Tenta primeiro com todos os campos extras
    const fullPayload = { ...base, cpf, city, notes, ...(source ? { source } : {}), ...(birthday ? { birthday } : {}) };
    const { data: d1, error: e1 } = await supabase.from('customers').insert([fullPayload]).select();
    if (!e1) return d1![0]; // campos extras salvos — sem necessidade de migração
    if (!isColErr(e1)) throw e1;
    // Fallback sem campos extras — retorna com flag de migração necessária
    const saved = await tryInsert('customers', [
      { ...base, ...(birthday ? { birthday } : {}) },
      base,
    ]);
    return hasCpfCity ? { ...saved, __migration_needed: true } : saved;
  },
  async updateCustomer(id: string, updates: any) {
    if (useMock) return updates;
    const { name, email, phone, cpf, city, notes, source, birthday } = updates;
    const hasCpfCity = !!(cpf?.trim() || city?.trim());
    const base: any = { name };
    if (email    !== undefined) base.email    = email;
    if (phone    !== undefined) base.phone    = phone;
    if (birthday !== undefined) base.birthday = birthday || null;
    const full: any = { ...base };
    if (cpf      !== undefined) full.cpf      = cpf;
    if (city     !== undefined) full.city     = city;
    if (notes    !== undefined) full.notes    = notes;
    if (source   !== undefined) full.source   = source;
    // Tenta primeiro com todos os campos
    const { data: d1, error: e1 } = await supabase.from('customers').update(full).eq('id', id).select();
    if (!e1) return d1![0];
    if (!isColErr(e1)) throw e1;
    // Fallback sem campos extras
    const baseNoBirthday: any = { name };
    if (email !== undefined) baseNoBirthday.email = email;
    if (phone !== undefined) baseNoBirthday.phone = phone;
    const saved = await tryUpdate('customers', id, [base, baseNoBirthday]);
    return hasCpfCity ? { ...saved, __migration_needed: true } : saved;
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
  async updateTransaction(id: string, updates: { description: string; amount: number; type: string; category: string; date: string }) {
    if (useMock) return;
    const { description, amount, type, category, date } = updates;
    const { error } = await supabase.from('transactions')
      .update({ description, amount, type, category, date })
      .eq('id', id);
    if (error) throw error;
    return true;
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

  // ─── Sellers (Vendedores) ────────────────────────────────────────────
  async getSellers() {
    if (useMock) return [];
    const uid = await getUid();
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    // Table not created yet — silently return empty list
    if (error && isTableErr(error)) return [];
    if (error) throw error;
    return data || [];
  },
  async addSeller(seller: { name: string; role: string; monthly_goal: number; color: string }) {
    if (useMock) return { id: crypto.randomUUID(), ...seller, active: true, created_at: new Date().toISOString() };
    const uid = await getUid();
    const { data, error } = await supabase
      .from('sellers')
      .insert([{ ...seller, user_id: uid, active: true }])
      .select();
    if (error && isTableErr(error)) {
      throw new Error(
        'Tabela de vendedores ainda não existe no Supabase. ' +
        'Clique em "SQL necessário" na tela de Vendedores, copie o script e execute no SQL Editor do Supabase.'
      );
    }
    if (error) throw error;
    return data![0];
  },
  async updateSeller(id: string, updates: Partial<{ name: string; role: string; monthly_goal: number; color: string; active: boolean }>) {
    if (useMock) return;
    const { data, error } = await supabase
      .from('sellers')
      .update(updates)
      .eq('id', id)
      .select();
    if (error && isTableErr(error)) {
      throw new Error('Tabela de vendedores não existe. Execute o SQL necessário no Supabase.');
    }
    if (error) throw error;
    return data![0];
  },
  async deleteSeller(id: string) {
    if (useMock) return;
    const { error } = await supabase.from('sellers').delete().eq('id', id);
    if (error && isTableErr(error)) return true; // table gone, nothing to delete
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
