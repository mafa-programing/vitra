-- ============================================================================
--  VITRA — sample data (run AFTER schema.sql)
--  Mirrors the prototype's catalog so the app + admin look populated on day one.
-- ============================================================================

insert into categories (slug, name, tone, sort_order) values
  ('dry-fruits','Dry Fruits','#e7c9a0',1),
  ('nuts','Nuts','#d8c3a5',2),
  ('seeds','Seeds & Berries','#c2d4a4',3),
  ('saffron-spices','Saffron & Spices','#e3b23c',4),
  ('gift-boxes','Gift Boxes','#d8c3a5',5),
  ('oils','Cold-Pressed Oils','#cde0b8',6),
  ('laptops','Laptops','#c8d2e0',7),
  ('mobiles','Smartphones','#d6c8e0',8),
  ('audio','Audio','#cfd8d2',9),
  ('travel-bags','Travel Bags','#e0cdb6',10)
on conflict (slug) do nothing;

with c as (select slug, id from categories)
insert into products (sku, name, brand, category_id, price, mrp, rating, review_count, stock, free_delivery, badge, tone, status, description, highlights, specs)
values
  ('VT-ALM-250','California Almonds, Premium','Vitra',(select id from c where slug='nuts'),549,699,4.8,1240,180,true,'BESTSELLER','#e7c9a0','published','Whole, hand-sorted California almonds — rich, crunchy and naturally sweet.','["Hand-sorted","No added preservatives","Rich in vitamin E"]','{"Origin":"California","Grade":"Premium","Shelf life":"9 months"}'),
  ('VT-CAS-250','Roasted Cashews W320','Vitra',(select id from c where slug='nuts'),629,799,4.7,980,140,true,'BESTSELLER','#e7d3a0','published','Big W320 cashews, slow-roasted for a buttery crunch.','["W320 jumbo grade","Lightly salted","Slow-roasted"]','{"Origin":"Mangalore","Grade":"W320"}'),
  ('VT-DAT-500','Jumbo Medjool Dates','Vitra',(select id from c where slug='dry-fruits'),399,549,4.9,1060,200,true,'-27%','#c9a27e','published','Soft, caramel-like Medjool dates — nature''s candy.','["Soft & moist","High fibre","Naturally sweet"]','{"Origin":"Jordan","Pack":"500g"}'),
  ('VT-SAF-002','Pure Kashmiri Saffron 2g','Vitra',(select id from c where slug='saffron-spices'),899,1199,4.9,700,40,true,'PREMIUM','#e3b23c','published','Grade A1 Mongra Kashmiri saffron — deep aroma, intense colour.','["Grade A1 Mongra","Lab-tested purity","Hand-harvested"]','{"Origin":"Pampore, Kashmir","Weight":"2g"}'),
  ('VT-PIS-250','Iranian Akbari Pistachios','Vitra',(select id from c where slug='nuts'),749,949,4.7,520,8,true,null,'#c2d4a4','published','Long Akbari pistachios — naturally opened, lightly roasted.','["Akbari long grade","Naturally opened"]','{"Origin":"Iran","Grade":"Akbari"}'),
  ('VT-WAL-250','Kashmiri Walnut Kernels','Vitra',(select id from c where slug='dry-fruits'),699,899,4.6,430,14,true,null,'#c9a27e','published','Light-halves walnut kernels, cold-stored for freshness.','["Light halves","Omega-3 rich"]','{"Origin":"Kashmir","Pack":"250g"}'),
  ('VT-GIFT-01','Signature Festive Gift Box','Vitra',(select id from c where slug='gift-boxes'),1499,1999,4.9,360,11,true,'LIMITED','#d8c3a5','published','A curated hamper of almonds, cashews, dates and saffron in a premium box.','["Premium magnetic box","Personalised note","4 assorted jars"]','{"Contents":"4 items","Weight":"800g"}'),
  ('VT-OIL-500','Cold-Pressed Almond Oil 500ml','Vitra',(select id from c where slug='oils'),549,749,4.5,210,90,true,null,'#cde0b8','published','Wood-pressed sweet almond oil — for cooking, skin and hair.','["Wood-pressed","Unrefined"]','{"Volume":"500ml","Process":"Cold-pressed"}'),
  ('VT-LAP-14','Vitra Voyager UltraBook 14','Vitra',(select id from c where slug='laptops'),74990,89990,4.6,320,22,true,null,'#c8d2e0','published','14" 2.8K OLED, 16GB RAM, 512GB SSD — light, fast, all-day battery.','["2.8K OLED","Sub-1.3kg","16h battery"]','{"RAM":"16GB","Storage":"512GB","Display":"14\" 2.8K OLED"}'),
  ('VT-MOB-01','Vitra Pulse 5G Smartphone','Vitra',(select id from c where slug='mobiles'),28990,33990,4.5,610,55,true,null,'#d6c8e0','published','6.5" AMOLED 120Hz, 5000mAh, triple camera.','["120Hz AMOLED","5000mAh","50MP triple cam"]','{"RAM":"8GB","Storage":"128GB","Battery":"5000mAh"}'),
  ('VT-AUD-01','Vitra Aura Wireless Headphones','Vitra',(select id from c where slug='audio'),8990,11990,4.7,840,70,true,'-25%','#cfd8d2','published','Active noise cancelling over-ear headphones, 40h playback.','["Hybrid ANC","40h battery","Multipoint"]','{"Type":"Over-ear","ANC":"Hybrid","Battery":"40h"}'),
  ('VT-BAG-01','Voyager Cabin Trolley','Vitra',(select id from c where slug='travel-bags'),7929,10979,4.7,410,30,true,'-28%','#e0cdb6','published','Polycarbonate cabin trolley, TSA lock, 8-wheel spinner.','["TSA lock","8-wheel spinner","Cabin-approved"]','{"Size":"55cm","Material":"Polycarbonate"}')
on conflict (sku) do nothing;

-- Pack-size variants for a couple of dry-fruit SKUs
with p as (select sku, id from products)
insert into product_variants (product_id, kind, label, price_delta, stock, is_default, sort_order) values
  ((select id from p where sku='VT-ALM-250'),'pack','250g',0,180,true,1),
  ((select id from p where sku='VT-ALM-250'),'pack','500g',520,120,false,2),
  ((select id from p where sku='VT-ALM-250'),'pack','1kg',1000,60,false,3),
  ((select id from p where sku='VT-CAS-250'),'pack','250g',0,140,true,1),
  ((select id from p where sku='VT-CAS-250'),'pack','500g',600,80,false,2),
  ((select id from p where sku='VT-LAP-14'),'config','16GB / 512GB',0,22,true,1),
  ((select id from p where sku='VT-LAP-14'),'config','32GB / 1TB',18000,8,false,2),
  ((select id from p where sku='VT-MOB-01'),'storage','128GB',0,55,true,1),
  ((select id from p where sku='VT-MOB-01'),'storage','256GB',3000,30,false,2)
on conflict do nothing;

insert into banners (tag, title, subtitle, cta, gradient, sort_order) values
  ('HARVEST SEASON','Fresh Almonds,\nStraight From California','Up to 30% off premium grade','Shop now','linear-gradient(120deg,#b97a2e,#9c6322)',1),
  ('GIFTING','Curated\nGift Boxes','Hand-packed festive hampers','Explore','linear-gradient(120deg,#3c4a32,#27331f)',2),
  ('NEW','Cold-Pressed\nOils','Wood-pressed, unrefined goodness','Discover','linear-gradient(120deg,#6b7a4a,#4a5733)',3)
on conflict do nothing;

insert into promo_codes (code, description, discount_type, amount, min_order) values
  ('FRESH100','₹100 off on orders above ₹999','flat',100,999),
  ('VITRA10','10% off your first order','percent',10,0),
  ('GIFT250','₹250 off gift boxes above ₹1499','flat',250,1499)
on conflict (code) do nothing;
