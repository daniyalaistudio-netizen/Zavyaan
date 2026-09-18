// ==========================================================
// ZAVYAAN REST API & HYBRID CLIENT
// Connects to Node/Postgres backend if available, or falls back
// to local persistent storage for instant offline / browser preview.
// ==========================================================

const defaultLocalCategories = [
  { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', description: 'Trendy & premium Pakistani apparel, footwear and modern accessories.', icon: 'shirt', image_url: 'assets/images/product_fashion_kurti_1787668675195.jpg', display_order: 1, is_active: true,
    subcategories: [
      { id: 'sub-mens-clothing', category_id: 'cat-fashion', name: "Men's Clothing", slug: 'mens-clothing', is_active: true },
      { id: 'sub-womens-clothing', category_id: 'cat-fashion', name: "Women's Clothing", slug: 'womens-clothing', is_active: true },
      { id: 'sub-kids-clothing', category_id: 'cat-fashion', name: "Kids Clothing", slug: 'kids-clothing', is_active: true },
      { id: 'sub-baby-clothing', category_id: 'cat-fashion', name: "Baby Clothing", slug: 'baby-clothing', is_active: true },
      { id: 'sub-footwear', category_id: 'cat-fashion', name: "Footwear", slug: 'footwear', is_active: true },
      { id: 'sub-fashion-accessories', category_id: 'cat-fashion', name: "Fashion Accessories", slug: 'fashion-accessories', is_active: true }
    ]
  },
  { id: 'cat-jewellery', name: 'Jewellery', slug: 'jewellery', description: 'Exquisite bridal sets, Kundan necklaces, gold-plated rings, earrings & watches.', icon: 'gem', image_url: 'assets/images/product_jewellery_set_1787668697922.jpg', display_order: 2, is_active: true,
    subcategories: [
      { id: 'sub-earrings', category_id: 'cat-jewellery', name: "Earrings", slug: 'earrings', is_active: true },
      { id: 'sub-necklaces', category_id: 'cat-jewellery', name: "Necklaces", slug: 'necklaces', is_active: true },
      { id: 'sub-bracelets', category_id: 'cat-jewellery', name: "Bracelets", slug: 'bracelets', is_active: true },
      { id: 'sub-rings', category_id: 'cat-jewellery', name: "Rings", slug: 'rings', is_active: true },
      { id: 'sub-watches', category_id: 'cat-jewellery', name: "Watches", slug: 'watches', is_active: true },
      { id: 'sub-jewellery-sets', category_id: 'cat-jewellery', name: "Jewellery Sets", slug: 'jewellery-sets', is_active: true },
      { id: 'sub-hair-accessories', category_id: 'cat-jewellery', name: "Hair Accessories", slug: 'hair-accessories', is_active: true }
    ]
  },
  { id: 'cat-kids-toys', name: 'Kids & Toys', slug: 'kids-toys', description: 'Educational STEM toys, baby care, remote control cars & playful adventures.', icon: 'baby', image_url: 'assets/images/product_kids_robot_1787668748049.jpg', display_order: 3, is_active: true,
    subcategories: [
      { id: 'sub-baby-products', category_id: 'cat-kids-toys', name: "Baby Products", slug: 'baby-products', is_active: true },
      { id: 'sub-educational-toys', category_id: 'cat-kids-toys', name: "Educational Toys", slug: 'educational-toys', is_active: true },
      { id: 'sub-action-play-toys', category_id: 'cat-kids-toys', name: "Action & Play Toys", slug: 'action-play-toys', is_active: true },
      { id: 'sub-dolls-soft-toys', category_id: 'cat-kids-toys', name: "Dolls & Soft Toys", slug: 'dolls-soft-toys', is_active: true },
      { id: 'sub-remote-control-toys', category_id: 'cat-kids-toys', name: "Remote Control Toys", slug: 'remote-control-toys', is_active: true },
      { id: 'sub-outdoor-sports-toys', category_id: 'cat-kids-toys', name: "Outdoor & Sports Toys", slug: 'outdoor-sports-toys', is_active: true },
      { id: 'sub-kids-accessories', category_id: 'cat-kids-toys', name: "Kids Accessories", slug: 'kids-accessories', is_active: true }
    ]
  },
  { id: 'cat-beauty', name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Organic skincare serums, hair care, cosmetics and luxury fragrances.', icon: 'sparkles', image_url: 'assets/images/product_beauty_serum_1787668795039.jpg', display_order: 4, is_active: true,
    subcategories: [
      { id: 'sub-skincare', category_id: 'cat-beauty', name: "Skincare", slug: 'skincare', is_active: true },
      { id: 'sub-hair-care', category_id: 'cat-beauty', name: "Hair Care", slug: 'hair-care', is_active: true },
      { id: 'sub-makeup', category_id: 'cat-beauty', name: "Makeup", slug: 'makeup', is_active: true },
      { id: 'sub-fragrances', category_id: 'cat-beauty', name: "Fragrances", slug: 'fragrances', is_active: true },
      { id: 'sub-grooming-products', category_id: 'cat-beauty', name: "Grooming Products", slug: 'grooming-products', is_active: true },
      { id: 'sub-personal-care', category_id: 'cat-beauty', name: "Personal Care", slug: 'personal-care', is_active: true }
    ]
  },
  { id: 'cat-home-living', name: 'Home & Living', slug: 'home-living', description: 'Aesthetic room decor, warm ambient lighting, kitchenware & organizers.', icon: 'home', image_url: 'assets/images/product_home_lamp_1787668839199.jpg', display_order: 5, is_active: true,
    subcategories: [
      { id: 'sub-home-decor', category_id: 'cat-home-living', name: "Home Decor", slug: 'home-decor', is_active: true },
      { id: 'sub-kitchen-dining', category_id: 'cat-home-living', name: "Kitchen & Dining", slug: 'kitchen-dining', is_active: true },
      { id: 'sub-storage-organization', category_id: 'cat-home-living', name: "Storage & Organization", slug: 'storage-organization', is_active: true },
      { id: 'sub-bedding-bath', category_id: 'cat-home-living', name: "Bedding & Bath", slug: 'bedding-bath', is_active: true },
      { id: 'sub-lighting', category_id: 'cat-home-living', name: "Lighting", slug: 'lighting', is_active: true },
      { id: 'sub-home-accessories', category_id: 'cat-home-living', name: "Home Accessories", slug: 'home-accessories', is_active: true }
    ]
  },
  { id: 'cat-electronics', name: 'Electronics & Accessories', slug: 'electronics-accessories', description: 'Smart watches, wireless ANC earbuds, high-speed fast chargers & gadgets.', icon: 'cpu', image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80', display_order: 6, is_active: true,
    subcategories: [
      { id: 'sub-mobile-accessories', category_id: 'cat-electronics', name: "Mobile Accessories", slug: 'mobile-accessories', is_active: true },
      { id: 'sub-smart-watches', category_id: 'cat-electronics', name: "Smart Watches", slug: 'smart-watches', is_active: true },
      { id: 'sub-earbuds-headphones', category_id: 'cat-electronics', name: "Earbuds & Headphones", slug: 'earbuds-headphones', is_active: true },
      { id: 'sub-speakers', category_id: 'cat-electronics', name: "Speakers", slug: 'speakers', is_active: true },
      { id: 'sub-chargers-cables', category_id: 'cat-electronics', name: "Chargers & Cables", slug: 'chargers-cables', is_active: true },
      { id: 'sub-computer-accessories', category_id: 'cat-electronics', name: "Computer Accessories", slug: 'computer-accessories', is_active: true },
      { id: 'sub-other-gadgets', category_id: 'cat-electronics', name: "Other Gadgets", slug: 'other-gadgets', is_active: true }
    ]
  },
  { id: 'cat-bags', name: 'Bags & Accessories', slug: 'bags-accessories', description: 'Designer vegan leather handbags, backpacks, wallets and travel gear.', icon: 'shopping-bag', image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80', display_order: 7, is_active: true,
    subcategories: [
      { id: 'sub-handbags', category_id: 'cat-bags', name: "Handbags", slug: 'handbags', is_active: true },
      { id: 'sub-wallets', category_id: 'cat-bags', name: "Wallets", slug: 'wallets', is_active: true },
      { id: 'sub-backpacks', category_id: 'cat-bags', name: "Backpacks", slug: 'backpacks', is_active: true },
      { id: 'sub-travel-bags', category_id: 'cat-bags', name: "Travel Bags", slug: 'travel-bags', is_active: true },
      { id: 'sub-crossbody-bags', category_id: 'cat-bags', name: "Crossbody Bags", slug: 'crossbody-bags', is_active: true },
      { id: 'sub-laptop-bags', category_id: 'cat-bags', name: "Laptop Bags", slug: 'laptop-bags', is_active: true }
    ]
  },
  { id: 'cat-deals', name: 'Deals & Offers', slug: 'deals-offers', description: 'Mega discounts, clearance sales, bundle savings and budget steals under Rs. 999.', icon: 'flame', image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80', display_order: 8, is_active: true,
    subcategories: [
      { id: 'sub-sale', category_id: 'cat-deals', name: "Sale", slug: 'sale', is_active: true },
      { id: 'sub-clearance', category_id: 'cat-deals', name: "Clearance", slug: 'clearance', is_active: true },
      { id: 'sub-bundle-deals', category_id: 'cat-deals', name: "Bundle Deals", slug: 'bundle-deals', is_active: true },
      { id: 'sub-under-999', category_id: 'cat-deals', name: "Under Rs. 999", slug: 'under-rs-999', is_active: true },
      { id: 'sub-under-1999', category_id: 'cat-deals', name: "Under Rs. 1,999", slug: 'under-rs-1999', is_active: true },
      { id: 'sub-special-offers', category_id: 'cat-deals', name: "Special Offers", slug: 'special-offers', is_active: true }
    ]
  }
];

const defaultLocalProducts = [
  {
    id: 'prod-emerald-kurti',
    title: 'Royal Emerald Embroidered Luxury Lawn Kurti',
    slug: 'royal-emerald-embroidered-luxury-lawn-kurti',
    description: 'Crafted with premium high-density breathable lawn fabric, featuring intricate tilla and thread embroidery on the neckline and daman. Comes paired with a matching luxury silk dupatta with border accents. Perfect for festive gatherings, casual dinners, and office elegance.',
    category_id: 'cat-fashion',
    category_name: 'Fashion',
    subcategory_id: 'sub-womens-clothing',
    subcategory_name: "Women's Clothing",
    regular_price: 5499,
    sale_price: 3899,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 45,
    sku: 'ZVN-FSH-001',
    tags: ['Lawn', 'Embroidered', 'Festive', 'Women Fashion', 'Kurti'],
    images: ['assets/images/product_fashion_kurti_1787668675195.jpg'],
    variants: [
      { variant_type: 'Size', name: 'Small', value: 'S', price_adjustment: 0 },
      { variant_type: 'Size', name: 'Medium', value: 'M', price_adjustment: 0 },
      { variant_type: 'Size', name: 'Large', value: 'L', price_adjustment: 0 },
      { variant_type: 'Size', name: 'XL', value: 'XL', price_adjustment: 200 }
    ]
  },
  {
    id: 'prod-kundan-set',
    title: 'Majestic Royal Kundan & Pearl Gold-Plated Bridal Set',
    slug: 'majestic-royal-kundan-pearl-gold-plated-bridal-set',
    description: 'Handcrafted traditional 22K micro gold-plated jewellery set featuring radiant emerald green stones, fine Kundan polki setting, and cascading freshwater luster pearls. Includes choker necklace, statement jhumkas, and matching maang tikka.',
    category_id: 'cat-jewellery',
    category_name: 'Jewellery',
    subcategory_id: 'sub-jewellery-sets',
    subcategory_name: 'Jewellery Sets',
    regular_price: 9999,
    sale_price: 6499,
    is_featured: true,
    is_bestseller: true,
    is_trending: false,
    is_active: true,
    stock_quantity: 20,
    sku: 'ZVN-JWL-002',
    tags: ['Kundan', 'Bridal', 'Gold Plated', 'Jhumkas', 'Jewellery'],
    images: ['assets/images/product_jewellery_set_1787668697922.jpg'],
    variants: [
      { variant_type: 'Color Theme', name: 'Emerald Green & Gold', value: '#059669', price_adjustment: 0 },
      { variant_type: 'Color Theme', name: 'Ruby Maroon & Gold', value: '#991b1b', price_adjustment: 0 }
    ]
  },
  {
    id: 'prod-stem-robot',
    title: 'CodeyBot Interactive STEM Coding & Robotics Kit',
    slug: 'codeybot-interactive-stem-coding-robotics-kit',
    description: 'Engage young minds with the CodeyBot STEM kit. Features responsive LED expressions, motor-driven gear mechanisms, modular coding blocks, and wireless remote control. Encourages logical thinking and early engineering skills for kids aged 5-12.',
    category_id: 'cat-kids-toys',
    category_name: 'Kids & Toys',
    subcategory_id: 'sub-educational-toys',
    subcategory_name: 'Educational Toys',
    regular_price: 4999,
    sale_price: 3499,
    is_featured: true,
    is_bestseller: false,
    is_trending: true,
    is_active: true,
    stock_quantity: 35,
    sku: 'ZVN-TOY-003',
    tags: ['STEM', 'Educational', 'Robot', 'Kids Toys'],
    images: ['assets/images/product_kids_robot_1787668748049.jpg'],
    variants: [
      { variant_type: 'Edition', name: 'Standard Edition (40 Pieces)', value: 'standard', price_adjustment: 0 },
      { variant_type: 'Edition', name: 'Pro Deluxe Edition (75 Pieces)', value: 'deluxe', price_adjustment: 1200 }
    ]
  },
  {
    id: 'prod-vitamin-c-serum',
    title: 'Botanica 20% Pure Vitamin C & Hyaluronic Radiant Glow Serum',
    slug: 'botanica-20-pure-vitamin-c-hyaluronic-radiant-glow-serum',
    description: 'Clinical grade brightening formula infused with 20% L-Ascorbic Acid, Ferulic Acid, and ultra-hydrating multi-molecular Hyaluronic Acid. Fades dark spots and pigmentation while giving skin a luminous, glass-skin glow.',
    category_id: 'cat-beauty',
    category_name: 'Beauty & Personal Care',
    subcategory_id: 'sub-skincare',
    subcategory_name: 'Skincare',
    regular_price: 2499,
    sale_price: 1799,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 80,
    sku: 'ZVN-BTY-004',
    tags: ['Skincare', 'Vitamin C', 'Glow Serum', 'Organic'],
    images: ['assets/images/product_beauty_serum_1787668795039.jpg'],
    variants: [
      { variant_type: 'Size', name: '30ml Dropper Bottle', value: '30ml', price_adjustment: 0 },
      { variant_type: 'Size', name: '50ml Value Pack', value: '50ml', price_adjustment: 900 }
    ]
  },
  {
    id: 'prod-nordic-lamp',
    title: 'Nordic Minimalist Mushroom Warm Glow Bedside Lamp',
    slug: 'nordic-minimalist-mushroom-warm-glow-bedside-lamp',
    description: 'Sleek Scandinavian dome lamp crafted with natural beech wood stem and matte-coated steel shade. Features 3-level touch dimming for relaxing ambient mood lighting and bedtime reading.',
    category_id: 'cat-home-living',
    category_name: 'Home & Living',
    subcategory_id: 'sub-lighting',
    subcategory_name: 'Lighting',
    regular_price: 4200,
    sale_price: 2999,
    is_featured: false,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 28,
    sku: 'ZVN-HOM-005',
    tags: ['Lamp', 'Home Decor', 'Lighting', 'Nordic'],
    images: ['assets/images/product_home_lamp_1787668839199.jpg'],
    variants: [
      { variant_type: 'Shade Color', name: 'Soft Cream Matte', value: '#fafaf9', price_adjustment: 0 },
      { variant_type: 'Shade Color', name: 'Midnight Charcoal', value: '#1e293b', price_adjustment: 0 }
    ]
  },
  {
    id: 'prod-ultra-smartwatch',
    title: 'Apex Ultra 2.0 HD AMOLED Bluetooth Calling Smart Watch',
    slug: 'apex-ultra-2-hd-amoled-bluetooth-calling-smart-watch',
    description: 'Flagship smartwatch with 2.02" edge-to-edge bright AMOLED display, IP68 water resistance, built-in speaker and mic for crystal-clear Bluetooth phone calls, and up to 7-day battery life.',
    category_id: 'cat-electronics',
    category_name: 'Electronics & Accessories',
    subcategory_id: 'sub-smart-watches',
    subcategory_name: 'Smart Watches',
    regular_price: 6999,
    sale_price: 4899,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 40,
    sku: 'ZVN-ELE-006',
    tags: ['Smart Watch', 'Gadgets', 'AMOLED', 'Fitness'],
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
    variants: [
      { variant_type: 'Color / Strap', name: 'Titanium Grey with Metallic Loop', value: 'titanium-grey', price_adjustment: 0 },
      { variant_type: 'Color / Strap', name: 'Obsidian Black with Silicone Strap', value: 'obsidian-black', price_adjustment: 0 }
    ]
  },
  {
    id: 'prod-leather-handbag',
    title: 'Elegance Textured Vegan Leather Crossbody Handbag',
    slug: 'elegance-textured-vegan-leather-crossbody-handbag',
    description: 'Chic everyday structured handbag crafted from premium scratch-resistant vegan leather with gold-tone hardware and secure magnetic closure.',
    category_id: 'cat-bags',
    category_name: 'Bags & Accessories',
    subcategory_id: 'sub-handbags',
    subcategory_name: 'Handbags',
    regular_price: 4800,
    sale_price: 3299,
    is_featured: false,
    is_bestseller: true,
    is_trending: false,
    is_active: true,
    stock_quantity: 30,
    sku: 'ZVN-BAG-007',
    tags: ['Handbag', 'Crossbody', 'Bags', 'Leather'],
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'],
    variants: [
      { variant_type: 'Color', name: 'Caramel Tan', value: '#b45309', price_adjustment: 0 },
      { variant_type: 'Color', name: 'Classic Black', value: '#0f172a', price_adjustment: 0 }
    ]
  },
  {
    id: 'prod-deal-anc-earbuds',
    title: 'SoundPro Active Noise-Cancelling True Wireless Earbuds',
    slug: 'soundpro-active-noise-cancelling-true-wireless-earbuds',
    description: 'Special promotional deal: High-fidelity deep bass drivers, active hybrid noise cancellation, dual-mic ENC for crystal-clear calls, wireless charging case with LED battery indicator.',
    category_id: 'cat-deals',
    category_name: 'Deals & Offers',
    subcategory_id: 'sub-special-offers',
    subcategory_name: 'Special Offers',
    regular_price: 3499,
    sale_price: 1899,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 60,
    sku: 'ZVN-DL-008',
    tags: ['Deals', 'Earbuds', 'ANC', 'Special Offer'],
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80'],
    variants: [
      { variant_type: 'Color', name: 'Matte Black', value: '#0f172a', price_adjustment: 0 },
      { variant_type: 'Color', name: 'Frost White', value: '#ffffff', price_adjustment: 0 }
    ]
  }
];

class LocalClientStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem('zavyaan_local_categories')) {
      localStorage.setItem('zavyaan_local_categories', JSON.stringify(defaultLocalCategories));
    }
    if (!localStorage.getItem('zavyaan_local_products')) {
      localStorage.setItem('zavyaan_local_products', JSON.stringify(defaultLocalProducts));
    }
    if (!localStorage.getItem('zavyaan_local_orders')) {
      localStorage.setItem('zavyaan_local_orders', JSON.stringify([]));
    }
  }

  getCategories(all = false) {
    let cats = JSON.parse(localStorage.getItem('zavyaan_local_categories') || '[]');
    if (!all) cats = cats.filter(c => c.is_active);
    return { success: true, categories: cats };
  }

  getProducts(params = {}) {
    let prods = JSON.parse(localStorage.getItem('zavyaan_local_products') || '[]');
    if (!params.all) prods = prods.filter(p => p.is_active);
    if (params.category) prods = prods.filter(p => p.category_id === params.category || p.category_name?.toLowerCase() === params.category.toLowerCase());
    if (params.subcategory) prods = prods.filter(p => p.subcategory_id === params.subcategory || p.subcategory_name?.toLowerCase() === params.subcategory.toLowerCase());
    if (params.search) {
      const q = params.search.toLowerCase();
      prods = prods.filter(p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }
    if (params.featured) prods = prods.filter(p => p.is_featured);
    if (params.bestseller) prods = prods.filter(p => p.is_bestseller);
    if (params.trending) prods = prods.filter(p => p.is_trending);
    return { success: true, count: prods.length, products: prods };
  }

  getProduct(idOrSlug) {
    const prods = JSON.parse(localStorage.getItem('zavyaan_local_products') || '[]');
    const p = prods.find(item => item.id === idOrSlug || item.slug === idOrSlug);
    if (!p) throw new Error('Product not found');
    return { success: true, product: p, relatedProducts: prods.slice(0, 3) };
  }

  createOrder(orderData) {
    const orders = JSON.parse(localStorage.getItem('zavyaan_local_orders') || '[]');
    const orderNum = 'ZVN-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      ...orderData,
      id: 'ord-' + Date.now(),
      order_number: orderNum,
      order_status: 'Pending',
      created_at: new Date().toISOString(),
      timeline: [
        { status: 'Pending', note: 'Order placed successfully by customer.', created_at: new Date().toISOString() }
      ]
    };
    orders.unshift(newOrder);
    localStorage.setItem('zavyaan_local_orders', JSON.stringify(orders));
    return { success: true, message: 'Order placed successfully!', order: newOrder };
  }

  trackOrder(orderNum) {
    const orders = JSON.parse(localStorage.getItem('zavyaan_local_orders') || '[]');
    const ord = orders.find(o => o.order_number.toUpperCase() === orderNum.trim().toUpperCase());
    if (!ord) throw new Error('No order found with this tracking ID.');
    return { success: true, order: ord };
  }

  getOrders(params = {}) {
    let orders = JSON.parse(localStorage.getItem('zavyaan_local_orders') || '[]');
    if (params.status && params.status !== 'all') {
      orders = orders.filter(o => o.order_status === params.status);
    }
    return { success: true, count: orders.length, orders };
  }

  updateOrderStatus(id, status, note = '') {
    const orders = JSON.parse(localStorage.getItem('zavyaan_local_orders') || '[]');
    const ord = orders.find(o => o.id === id || o.order_number === id);
    if (!ord) throw new Error('Order not found');
    ord.order_status = status;
    ord.timeline.push({ status, note: note || `Status updated to ${status}`, created_at: new Date().toISOString() });
    localStorage.setItem('zavyaan_local_orders', JSON.stringify(orders));
    return { success: true, order: ord };
  }

  getStats() {
    const orders = JSON.parse(localStorage.getItem('zavyaan_local_orders') || '[]');
    const prods = JSON.parse(localStorage.getItem('zavyaan_local_products') || '[]');
    const totalSales = orders.filter(o => o.order_status !== 'Cancelled' && o.order_status !== 'Returned').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    return {
      success: true,
      stats: {
        totalSales,
        ordersCount: {
          total: orders.length,
          pending: orders.filter(o => o.order_status === 'Pending').length,
          confirmed: orders.filter(o => o.order_status === 'Confirmed').length,
          processing: orders.filter(o => o.order_status === 'Processing').length,
          shipped: orders.filter(o => o.order_status === 'Shipped').length,
          delivered: orders.filter(o => o.order_status === 'Delivered').length,
          cancelled: orders.filter(o => o.order_status === 'Cancelled').length,
          returned: orders.filter(o => o.order_status === 'Returned').length
        },
        recentOrders: orders.slice(0, 8)
      }
    };
  }

  saveCategory(payload) {
    const cats = JSON.parse(localStorage.getItem('zavyaan_local_categories') || '[]');
    const slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCat = { ...payload, id: payload.id || 'cat-' + slug, slug, subcategories: [] };
    cats.push(newCat);
    localStorage.setItem('zavyaan_local_categories', JSON.stringify(cats));
    return { success: true, category: newCat };
  }

  deleteCategory(id) {
    let cats = JSON.parse(localStorage.getItem('zavyaan_local_categories') || '[]');
    cats = cats.filter(c => c.id !== id);
    localStorage.setItem('zavyaan_local_categories', JSON.stringify(cats));
    return { success: true };
  }

  saveProduct(payload) {
    const prods = JSON.parse(localStorage.getItem('zavyaan_local_products') || '[]');
    const slug = payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newProd = {
      ...payload,
      id: payload.id || 'prod-' + slug + '-' + Math.floor(Math.random() * 1000),
      slug,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      regular_price: Number(payload.regular_price),
      sale_price: payload.sale_price ? Number(payload.sale_price) : null
    };
    prods.unshift(newProd);
    localStorage.setItem('zavyaan_local_products', JSON.stringify(prods));
    return { success: true, product: newProd };
  }

  deleteProduct(id) {
    let prods = JSON.parse(localStorage.getItem('zavyaan_local_products') || '[]');
    prods = prods.filter(p => p.id !== id);
    localStorage.setItem('zavyaan_local_products', JSON.stringify(prods));
    return { success: true };
  }
}

const localClient = new LocalClientStore();

const API = {
  baseUrl: '/api',

  tokenKey: 'zavyaan_admin_token',
  getToken() { try { return localStorage.getItem(this.tokenKey) || ''; } catch (e) { return ''; } },
  setToken(t) { try { t ? localStorage.setItem(this.tokenKey, t) : localStorage.removeItem(this.tokenKey); } catch (e) { /* storage unavailable */ } },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err) {
      // Server genuinely unreachable: use the local browser fallback store.
      return this.fallbackRequest(endpoint, options);
    }
    // The server answered. A 4xx/5xx carries a real message (validation,
    // not found, demo-mode block) — surface it instead of faking success.
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON body */ }
    if (res.status === 401 && !endpoint.startsWith('/admin/auth/login')) {
      // Session gone (expired, idle, or replaced by another device): back to login.
      this.setToken('');
      if (window.Admin && typeof window.Admin.onSessionLost === 'function') window.Admin.onSessionLost(data.message);
      throw new Error(data.message || 'Please log in again.');
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  fallbackRequest(endpoint, options) {
    if (endpoint.startsWith('/categories/subcategories') && options.method === 'POST') {
      const body = JSON.parse(options.body);
      const cats = JSON.parse(localStorage.getItem('zavyaan_local_categories') || '[]');
      const cat = cats.find(c => c.id === body.category_id);
      if (cat) {
        if (!cat.subcategories) cat.subcategories = [];
        const subSlug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newSub = { id: 'sub-' + subSlug, category_id: cat.id, name: body.name, slug: subSlug, is_active: true };
        cat.subcategories.push(newSub);
        localStorage.setItem('zavyaan_local_categories', JSON.stringify(cats));
        return { success: true, subcategory: newSub };
      }
    }
    if (endpoint.startsWith('/categories') && options.method === 'POST') return localClient.saveCategory(JSON.parse(options.body));
    if (endpoint.startsWith('/categories/') && options.method === 'DELETE') return localClient.deleteCategory(endpoint.replace('/categories/', ''));
    if (endpoint.startsWith('/categories/') && options.method === 'PUT') {
      const id = endpoint.replace('/categories/', '');
      const body = JSON.parse(options.body);
      const cats = JSON.parse(localStorage.getItem('zavyaan_local_categories') || '[]');
      const idx = cats.findIndex(c => c.id === id);
      if (idx >= 0) { cats[idx] = { ...cats[idx], ...body }; localStorage.setItem('zavyaan_local_categories', JSON.stringify(cats)); }
      return { success: true };
    }
    if (endpoint.startsWith('/categories')) return localClient.getCategories(endpoint.includes('all=true'));
    if (endpoint.startsWith('/products') && options.method === 'POST') return localClient.saveProduct(JSON.parse(options.body));
    if (endpoint.startsWith('/products/') && options.method === 'DELETE') return localClient.deleteProduct(endpoint.replace('/products/', ''));
    if (endpoint.startsWith('/products/') && options.method === 'PUT') {
      const id = endpoint.replace('/products/', '');
      const body = JSON.parse(options.body);
      const prods = JSON.parse(localStorage.getItem('zavyaan_local_products') || '[]');
      const idx = prods.findIndex(p => p.id === id);
      if (idx >= 0) { prods[idx] = { ...prods[idx], ...body }; localStorage.setItem('zavyaan_local_products', JSON.stringify(prods)); }
      return { success: true };
    }
    if (endpoint.startsWith('/products/') && !endpoint.includes('?')) return localClient.getProduct(endpoint.replace('/products/', ''));
    if (endpoint.startsWith('/products')) return localClient.getProducts({});
    if (endpoint.startsWith('/orders/track/')) return localClient.trackOrder(decodeURIComponent(endpoint.replace('/orders/track/', '')));
    if (endpoint.startsWith('/orders/') && endpoint.includes('/status')) {
      const id = endpoint.split('/')[2];
      const body = JSON.parse(options.body);
      return localClient.updateOrderStatus(id, body.status, body.note);
    }
    if (endpoint.startsWith('/orders') && options.method === 'POST') return localClient.createOrder(JSON.parse(options.body));
    if (endpoint.startsWith('/orders')) return localClient.getOrders({});
    if (endpoint.startsWith('/admin/stats')) return localClient.getStats();
    if (endpoint.startsWith('/admin/auth/login')) return { success: true, user: { role: 'admin' } };

    return { success: true };
  },

  // Categories
  async getCategories(admin = false) { return this.request(`/categories?all=${admin}`); },
  async getCategory(slugOrId) {
    try { return await this.request(`/categories/${slugOrId}`); }
    catch {
      const cats = localClient.getCategories(true).categories;
      const cat = cats.find(c => c.slug === slugOrId || c.id === slugOrId);
      if (!cat) throw new Error('Category not found');
      return { success: true, category: cat };
    }
  },
  async createCategory(payload) { return this.request('/categories', { method: 'POST', body: JSON.stringify(payload) }); },
  async updateCategory(id, payload) { return this.request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); },
  async deleteCategory(id) { return this.request(`/categories/${id}`, { method: 'DELETE' }); },
  async createSubcategory(payload) { return this.request('/categories/subcategories', { method: 'POST', body: JSON.stringify(payload) }); },
  async deleteSubcategory(id) { return this.request(`/categories/subcategories/${id}`, { method: 'DELETE' }); },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.subcategory) query.append('subcategory', params.subcategory);
    if (params.search) query.append('search', params.search);
    if (params.minPrice) query.append('min_price', params.minPrice);
    if (params.maxPrice) query.append('max_price', params.maxPrice);
    if (params.featured) query.append('featured', 'true');
    if (params.bestseller) query.append('bestseller', 'true');
    if (params.trending) query.append('trending', 'true');
    if (params.sort) query.append('sort', params.sort);
    if (params.all) query.append('all', 'true');
    if (params.limit) query.append('limit', params.limit);
    return this.request(`/products?${query.toString()}`);
  },
  async getProduct(idOrSlug) { return this.request(`/products/${idOrSlug}`); },
  async createProduct(payload) { return this.request('/products', { method: 'POST', body: JSON.stringify(payload) }); },
  async updateProduct(id, payload) { return this.request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); },
  async deleteProduct(id) { return this.request(`/products/${id}`, { method: 'DELETE' }); },

  // Orders
  async placeOrder(orderData) { return this.request('/orders', { method: 'POST', body: JSON.stringify(orderData) }); },
  async trackOrder(orderNumber) { return this.request(`/orders/track/${encodeURIComponent(orderNumber)}`); },
  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/orders?${query.toString()}`);
  },
  async getOrder(id) {
    try { return await this.request(`/orders/${id}`); }
    catch { return localClient.trackOrder(id); }
  },
  async updateOrderStatus(id, status, note = '') {
    return this.request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
  },

  // Store settings (payment methods, homepage banners, collections)
  async getSettings(all = false) { return this.request(`/settings${all ? '?all=true' : ''}`); },
  async updateSettings(patch) { return this.request('/settings', { method: 'PUT', body: JSON.stringify(patch) }); },

  // Stock quick edit
  async setStock(id, payload) { return this.request(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify(payload) }); },

  // Accounts & Ledger
  async getVendors() { return this.request('/ledger/vendors'); },
  async createVendor(payload) { return this.request('/ledger/vendors', { method: 'POST', body: JSON.stringify(payload) }); },
  async updateVendor(id, payload) { return this.request(`/ledger/vendors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); },
  async deleteVendor(id) { return this.request(`/ledger/vendors/${id}`, { method: 'DELETE' }); },
  async getVendorStatement(id) { return this.request(`/ledger/vendors/${id}/statement`); },
  async getPurchases(params = {}) { const q = new URLSearchParams(params); return this.request(`/ledger/purchases?${q}`); },
  async createPurchase(payload) { return this.request('/ledger/purchases', { method: 'POST', body: JSON.stringify(payload) }); },
  async deletePurchase(id) { return this.request(`/ledger/purchases/${id}`, { method: 'DELETE' }); },
  async getVendorPayments(params = {}) { const q = new URLSearchParams(params); return this.request(`/ledger/payments?${q}`); },
  async createVendorPayment(payload) { return this.request('/ledger/payments', { method: 'POST', body: JSON.stringify(payload) }); },
  async deleteVendorPayment(id) { return this.request(`/ledger/payments/${id}`, { method: 'DELETE' }); },
  async getExpenses() { return this.request('/ledger/expenses'); },
  async createExpense(payload) { return this.request('/ledger/expenses', { method: 'POST', body: JSON.stringify(payload) }); },
  async deleteExpense(id) { return this.request(`/ledger/expenses/${id}`, { method: 'DELETE' }); },
  async getLedgerSummary() { return this.request('/ledger/summary'); },
  async getAnalytics(days = 14) { return this.request(`/admin/analytics?days=${days}`); },

  // Admin
  async getAdminStats() { return this.request('/admin/stats'); },
  async adminLogin(username, password) { return this.request('/admin/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); },
  async adminLogout() { try { await this.request('/admin/auth/logout', { method: 'POST' }); } catch (e) { /* already out */ } this.setToken(''); },
  async adminMe() { return this.request('/admin/auth/me'); }
};

window.API = API;
