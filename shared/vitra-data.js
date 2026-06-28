// ============================================================================
//  Vitra shared data layer — the single seam between the UI and Supabase.
//  Used by BOTH the customer app and the admin dashboard so an admin write
//  shows up in the app (and vice-versa). Import as an ES module:
//
//    import { Vitra } from './shared/vitra-data.js';
//    const products = await Vitra.products.list();
//
//  Config comes from shared/config.js (copy config.example.js -> config.js and
//  fill in your Supabase URL + anon key). The admin server uses the SERVICE key.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { VITRA_ENV } from './config.js';

export const supabase = createClient(VITRA_ENV.SUPABASE_URL, VITRA_ENV.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const rows = (res) => { if (res.error) throw res.error; return res.data; };
const row  = (res) => { if (res.error) throw res.error; return res.data; };

export const Vitra = {
  // ---- catalog (public) ----
  categories: {
    list: () => supabase.from('categories').select('*').eq('visible', true).order('sort_order').then(rows),
  },
  products: {
    list: ({ category = null, search = null, limit = 50 } = {}) => {
      let q = supabase.from('products').select('*, product_variants(*)').neq('status', 'draft').limit(limit);
      if (category) q = q.eq('category_id', category);
      if (search)   q = q.ilike('name', `%${search}%`);
      return q.order('created_at', { ascending: false }).then(rows);
    },
    get: (id) => supabase.from('products').select('*, product_variants(*), reviews(*)').eq('id', id).single().then(row),
    // admin (service key) writes:
    upsert: (p) => supabase.from('products').upsert(p).select().then(rows),
    remove: (id) => supabase.from('products').delete().eq('id', id).then(() => true),
  },
  banners: { list: () => supabase.from('banners').select('*').eq('active', true).order('sort_order').then(rows) },
  promos:  {
    list: () => supabase.from('promo_codes').select('*').eq('active', true).then(rows),
    validate: async (code, subtotal) => {
      const p = await supabase.from('promo_codes').select('*').eq('code', code).eq('active', true).single().then(row);
      if (!p) return { ok: false, reason: 'Invalid code' };
      if (subtotal < (p.min_order || 0)) return { ok: false, reason: `Min order ₹${p.min_order}` };
      const off = p.discount_type === 'percent' ? Math.round(subtotal * p.amount / 100) : p.amount;
      return { ok: true, discount: off, promo: p };
    },
  },

  // ---- auth ----
  auth: {
    user: () => supabase.auth.getUser().then((r) => r.data.user),
    signUp:  (email, password, full_name) => supabase.auth.signUp({ email, password, options: { data: { full_name } } }).then(row),
    signIn:  (email, password) => supabase.auth.signInWithPassword({ email, password }).then(row),
    signOut: () => supabase.auth.signOut(),
  },

  // ---- customer-scoped (RLS enforced) ----
  profile:   { get: () => supabase.from('customers').select('*, addresses(*)').single().then(row),
               update: (patch) => supabase.from('customers').update(patch).eq('id', patch.id).select().then(rows) },
  wishlist:  { list: () => supabase.from('wishlist_items').select('product_id, products(*)').then(rows),
               add: (product_id) => supabase.from('wishlist_items').insert({ product_id }).then(() => true),
               remove: (product_id) => supabase.from('wishlist_items').delete().eq('product_id', product_id).then(() => true) },
  orders: {
    list: () => supabase.from('orders').select('*, order_items(*), order_events(*)').order('placed_at', { ascending: false }).then(rows),
    get:  (id) => supabase.from('orders').select('*, order_items(*), order_events(*)').eq('id', id).single().then(row),
    place: async ({ items, address, payment_method, promo_code, totals }) => {
      const order = await supabase.from('orders').insert({
        address, payment_method, promo_code,
        subtotal: totals.subtotal, discount: totals.discount,
        delivery_fee: totals.delivery_fee, tax: totals.tax, total: totals.total,
        status: payment_method === 'cod' ? 'pending' : 'paid',
      }).select().single().then(row);
      await supabase.from('order_items').insert(items.map((i) => ({
        order_id: order.id, product_id: i.product_id, name: i.name,
        variant: i.variant, unit_price: i.unit_price, qty: i.qty, tone: i.tone,
      })));
      await supabase.from('order_events').insert({ order_id: order.id, status: order.status, title: 'Order placed' });
      return order;
    },
  },
  notifications: { list: () => supabase.from('notifications').select('*').order('created_at', { ascending: false }).then(rows),
                   markRead: (id) => supabase.from('notifications').update({ read: true }).eq('id', id).then(() => true) },

  // ---- realtime: keep the app/admin live ----
  onProductsChange: (cb) => supabase.channel('products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, cb).subscribe(),
  onOrdersChange: (cb) => supabase.channel('orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, cb).subscribe(),
};
