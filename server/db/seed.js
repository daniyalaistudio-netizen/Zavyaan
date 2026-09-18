const db = require('./db');

const initialCategories = [
  {
    id: 'cat-fashion',
    name: 'Fashion',
    slug: 'fashion',
    description: 'Trendy & premium Pakistani apparel, footwear and modern accessories.',
    icon: 'shirt',
    image_url: '/assets/images/product_fashion_kurti_1787668675195.jpg',
    display_order: 1,
    is_active: true
  },
  {
    id: 'cat-jewellery',
    name: 'Jewellery',
    slug: 'jewellery',
    description: 'Exquisite bridal sets, Kundan necklaces, gold-plated rings, earrings & watches.',
    icon: 'gem',
    image_url: '/assets/images/product_jewellery_set_1787668697922.jpg',
    display_order: 2,
    is_active: true
  },
  {
    id: 'cat-kids-toys',
    name: 'Kids & Toys',
    slug: 'kids-toys',
    description: 'Educational STEM toys, baby care, remote control cars & playful adventures.',
    icon: 'baby',
    image_url: '/assets/images/product_kids_robot_1787668748049.jpg',
    display_order: 3,
    is_active: true
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Organic skincare serums, hair care, cosmetics and luxury fragrances.',
    icon: 'sparkles',
    image_url: '/assets/images/product_beauty_serum_1787668795039.jpg',
    display_order: 4,
    is_active: true
  },
  {
    id: 'cat-home-living',
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Aesthetic room decor, warm ambient lighting, kitchenware & organizers.',
    icon: 'home',
    image_url: '/assets/images/product_home_lamp_1787668839199.jpg',
    display_order: 5,
    is_active: true
  },
  {
    id: 'cat-electronics',
    name: 'Electronics & Accessories',
    slug: 'electronics-accessories',
    description: 'Smart watches, wireless ANC earbuds, high-speed fast chargers & gadgets.',
    icon: 'cpu',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    display_order: 6,
    is_active: true
  },
  {
    id: 'cat-bags',
    name: 'Bags & Accessories',
    slug: 'bags-accessories',
    description: 'Designer vegan leather handbags, backpacks, wallets and travel gear.',
    icon: 'shopping-bag',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
    display_order: 7,
    is_active: true
  },
  {
    id: 'cat-deals',
    name: 'Deals & Offers',
    slug: 'deals-offers',
    description: 'Mega discounts, clearance sales, bundle savings and budget steals under Rs. 999.',
    icon: 'flame',
    image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
    display_order: 8,
    is_active: true
  }
];

const initialSubcategories = [
  // Fashion
  { id: 'sub-mens-clothing', category_id: 'cat-fashion', name: "Men's Clothing", slug: 'mens-clothing', display_order: 1 },
  { id: 'sub-womens-clothing', category_id: 'cat-fashion', name: "Women's Clothing", slug: 'womens-clothing', display_order: 2 },
  { id: 'sub-kids-clothing', category_id: 'cat-fashion', name: "Kids Clothing", slug: 'kids-clothing', display_order: 3 },
  { id: 'sub-baby-clothing', category_id: 'cat-fashion', name: "Baby Clothing", slug: 'baby-clothing', display_order: 4 },
  { id: 'sub-footwear', category_id: 'cat-fashion', name: "Footwear", slug: 'footwear', display_order: 5 },
  { id: 'sub-fashion-accessories', category_id: 'cat-fashion', name: "Fashion Accessories", slug: 'fashion-accessories', display_order: 6 },

  // Jewellery
  { id: 'sub-earrings', category_id: 'cat-jewellery', name: "Earrings", slug: 'earrings', display_order: 1 },
  { id: 'sub-necklaces', category_id: 'cat-jewellery', name: "Necklaces", slug: 'necklaces', display_order: 2 },
  { id: 'sub-bracelets', category_id: 'cat-jewellery', name: "Bracelets", slug: 'bracelets', display_order: 3 },
  { id: 'sub-rings', category_id: 'cat-jewellery', name: "Rings", slug: 'rings', display_order: 4 },
  { id: 'sub-watches', category_id: 'cat-jewellery', name: "Watches", slug: 'watches', display_order: 5 },
  { id: 'sub-jewellery-sets', category_id: 'cat-jewellery', name: "Jewellery Sets", slug: 'jewellery-sets', display_order: 6 },
  { id: 'sub-hair-accessories', category_id: 'cat-jewellery', name: "Hair Accessories", slug: 'hair-accessories', display_order: 7 },

  // Kids & Toys
  { id: 'sub-baby-products', category_id: 'cat-kids-toys', name: "Baby Products", slug: 'baby-products', display_order: 1 },
  { id: 'sub-educational-toys', category_id: 'cat-kids-toys', name: "Educational Toys", slug: 'educational-toys', display_order: 2 },
  { id: 'sub-action-play-toys', category_id: 'cat-kids-toys', name: "Action & Play Toys", slug: 'action-play-toys', display_order: 3 },
  { id: 'sub-dolls-soft-toys', category_id: 'cat-kids-toys', name: "Dolls & Soft Toys", slug: 'dolls-soft-toys', display_order: 4 },
  { id: 'sub-remote-control-toys', category_id: 'cat-kids-toys', name: "Remote Control Toys", slug: 'remote-control-toys', display_order: 5 },
  { id: 'sub-outdoor-sports-toys', category_id: 'cat-kids-toys', name: "Outdoor & Sports Toys", slug: 'outdoor-sports-toys', display_order: 6 },
  { id: 'sub-kids-accessories', category_id: 'cat-kids-toys', name: "Kids Accessories", slug: 'kids-accessories', display_order: 7 },

  // Beauty & Personal Care
  { id: 'sub-skincare', category_id: 'cat-beauty', name: "Skincare", slug: 'skincare', display_order: 1 },
  { id: 'sub-hair-care', category_id: 'cat-beauty', name: "Hair Care", slug: 'hair-care', display_order: 2 },
  { id: 'sub-makeup', category_id: 'cat-beauty', name: "Makeup", slug: 'makeup', display_order: 3 },
  { id: 'sub-fragrances', category_id: 'cat-beauty', name: "Fragrances", slug: 'fragrances', display_order: 4 },
  { id: 'sub-grooming-products', category_id: 'cat-beauty', name: "Grooming Products", slug: 'grooming-products', display_order: 5 },
  { id: 'sub-personal-care', category_id: 'cat-beauty', name: "Personal Care", slug: 'personal-care', display_order: 6 },

  // Home & Living
  { id: 'sub-home-decor', category_id: 'cat-home-living', name: "Home Decor", slug: 'home-decor', display_order: 1 },
  { id: 'sub-kitchen-dining', category_id: 'cat-home-living', name: "Kitchen & Dining", slug: 'kitchen-dining', display_order: 2 },
  { id: 'sub-storage-organization', category_id: 'cat-home-living', name: "Storage & Organization", slug: 'storage-organization', display_order: 3 },
  { id: 'sub-bedding-bath', category_id: 'cat-home-living', name: "Bedding & Bath", slug: 'bedding-bath', display_order: 4 },
  { id: 'sub-lighting', category_id: 'cat-home-living', name: "Lighting", slug: 'lighting', display_order: 5 },
  { id: 'sub-home-accessories', category_id: 'cat-home-living', name: "Home Accessories", slug: 'home-accessories', display_order: 6 },

  // Electronics & Accessories
  { id: 'sub-mobile-accessories', category_id: 'cat-electronics', name: "Mobile Accessories", slug: 'mobile-accessories', display_order: 1 },
  { id: 'sub-smart-watches', category_id: 'cat-electronics', name: "Smart Watches", slug: 'smart-watches', display_order: 2 },
  { id: 'sub-earbuds-headphones', category_id: 'cat-electronics', name: "Earbuds & Headphones", slug: 'earbuds-headphones', display_order: 3 },
  { id: 'sub-speakers', category_id: 'cat-electronics', name: "Speakers", slug: 'speakers', display_order: 4 },
  { id: 'sub-chargers-cables', category_id: 'cat-electronics', name: "Chargers & Cables", slug: 'chargers-cables', display_order: 5 },
  { id: 'sub-computer-accessories', category_id: 'cat-electronics', name: "Computer Accessories", slug: 'computer-accessories', display_order: 6 },
  { id: 'sub-other-gadgets', category_id: 'cat-electronics', name: "Other Gadgets", slug: 'other-gadgets', display_order: 7 },

  // Bags & Accessories
  { id: 'sub-handbags', category_id: 'cat-bags', name: "Handbags", slug: 'handbags', display_order: 1 },
  { id: 'sub-wallets', category_id: 'cat-bags', name: "Wallets", slug: 'wallets', display_order: 2 },
  { id: 'sub-backpacks', category_id: 'cat-bags', name: "Backpacks", slug: 'backpacks', display_order: 3 },
  { id: 'sub-travel-bags', category_id: 'cat-bags', name: "Travel Bags", slug: 'travel-bags', display_order: 4 },
  { id: 'sub-crossbody-bags', category_id: 'cat-bags', name: "Crossbody Bags", slug: 'crossbody-bags', display_order: 5 },
  { id: 'sub-laptop-bags', category_id: 'cat-bags', name: "Laptop Bags", slug: 'laptop-bags', display_order: 6 },

  // Deals & Offers
  { id: 'sub-sale', category_id: 'cat-deals', name: "Sale", slug: 'sale', display_order: 1 },
  { id: 'sub-clearance', category_id: 'cat-deals', name: "Clearance", slug: 'clearance', display_order: 2 },
  { id: 'sub-bundle-deals', category_id: 'cat-deals', name: "Bundle Deals", slug: 'bundle-deals', display_order: 3 },
  { id: 'sub-under-999', category_id: 'cat-deals', name: "Under Rs. 999", slug: 'under-rs-999', display_order: 4 },
  { id: 'sub-under-1999', category_id: 'cat-deals', name: "Under Rs. 1,999", slug: 'under-rs-1999', display_order: 5 },
  { id: 'sub-special-offers', category_id: 'cat-deals', name: "Special Offers", slug: 'special-offers', display_order: 6 }
];

const sampleProducts = [
  {
    id: 'prod-emerald-kurti',
    title: 'Royal Emerald Embroidered Luxury Lawn Kurti',
    slug: 'royal-emerald-embroidered-luxury-lawn-kurti',
    description: 'Crafted with premium high-density breathable lawn fabric, featuring intricate tilla and thread embroidery on the neckline and daman. Comes paired with a matching luxury silk dupatta with border accents. Perfect for festive gatherings, casual dinners, and office elegance.',
    category_id: 'cat-fashion',
    subcategory_id: 'sub-womens-clothing',
    regular_price: 5499,
    sale_price: 3899,
    cost_price: 2100,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 45,
    sku: 'ZVN-FSH-001',
    tags: ['Lawn', 'Embroidered', 'Festive', 'Women Fashion', 'Kurti'],
    images: [
      { image_url: '/assets/images/product_fashion_kurti_1787668675195.jpg', alt_text: 'Emerald Kurti Front' }
    ],
    variants: [
      { variant_type: 'Size', name: 'Small', value: 'S', price_adjustment: 0, stock_quantity: 12 },
      { variant_type: 'Size', name: 'Medium', value: 'M', price_adjustment: 0, stock_quantity: 18 },
      { variant_type: 'Size', name: 'Large', value: 'L', price_adjustment: 0, stock_quantity: 10 },
      { variant_type: 'Size', name: 'XL', value: 'XL', price_adjustment: 200, stock_quantity: 5 }
    ]
  },
  {
    id: 'prod-kundan-set',
    title: 'Majestic Royal Kundan & Pearl Gold-Plated Bridal Set',
    slug: 'majestic-royal-kundan-pearl-gold-plated-bridal-set',
    description: 'Handcrafted traditional 22K micro gold-plated jewellery set featuring radiant emerald green stones, fine Kundan polki setting, and cascading freshwater luster pearls. Includes choker necklace, statement jhumkas, and matching maang tikka.',
    category_id: 'cat-jewellery',
    subcategory_id: 'sub-jewellery-sets',
    regular_price: 9999,
    sale_price: 6499,
    cost_price: 3200,
    is_featured: true,
    is_bestseller: true,
    is_trending: false,
    is_active: true,
    stock_quantity: 20,
    sku: 'ZVN-JWL-002',
    tags: ['Kundan', 'Bridal', 'Gold Plated', 'Jhumkas', 'Jewellery'],
    images: [
      { image_url: '/assets/images/product_jewellery_set_1787668697922.jpg', alt_text: 'Kundan Set Display' }
    ],
    variants: [
      { variant_type: 'Color Theme', name: 'Emerald Green & Gold', value: '#059669', price_adjustment: 0, stock_quantity: 12 },
      { variant_type: 'Color Theme', name: 'Ruby Maroon & Gold', value: '#991b1b', price_adjustment: 0, stock_quantity: 8 }
    ]
  },
  {
    id: 'prod-stem-robot',
    title: 'CodeyBot Interactive STEM Coding & Robotics Kit',
    slug: 'codeybot-interactive-stem-coding-robotics-kit',
    description: 'Engage young minds with the CodeyBot STEM kit. Features responsive LED expressions, motor-driven gear mechanisms, modular coding blocks, and wireless remote control. Encourages logical thinking, spatial awareness, and early engineering skills for kids aged 5-12.',
    category_id: 'cat-kids-toys',
    subcategory_id: 'sub-educational-toys',
    regular_price: 4999,
    sale_price: 3499,
    cost_price: 1800,
    is_featured: true,
    is_bestseller: false,
    is_trending: true,
    is_active: true,
    stock_quantity: 35,
    sku: 'ZVN-TOY-003',
    tags: ['STEM', 'Educational', 'Robot', 'Kids Toys', 'Electronics'],
    images: [
      { image_url: '/assets/images/product_kids_robot_1787668748049.jpg', alt_text: 'STEM Robot Main' }
    ],
    variants: [
      { variant_type: 'Edition', name: 'Standard Edition (40 Pieces)', value: 'standard', price_adjustment: 0, stock_quantity: 25 },
      { variant_type: 'Edition', name: 'Pro Deluxe Edition (75 Pieces + Sensor Pack)', value: 'deluxe', price_adjustment: 1200, stock_quantity: 10 }
    ]
  },
  {
    id: 'prod-vitamin-c-serum',
    title: 'Botanica 20% Pure Vitamin C & Hyaluronic Radiant Glow Serum',
    slug: 'botanica-20-pure-vitamin-c-hyaluronic-radiant-glow-serum',
    description: 'Clinical grade brightening formula infused with 20% L-Ascorbic Acid, Ferulic Acid, and ultra-hydrating multi-molecular Hyaluronic Acid. Fades dark spots, sun damage, and pigmentation while giving skin a luminous, glass-skin glow.',
    category_id: 'cat-beauty',
    subcategory_id: 'sub-skincare',
    regular_price: 2499,
    sale_price: 1799,
    cost_price: 750,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 80,
    sku: 'ZVN-BTY-004',
    tags: ['Skincare', 'Vitamin C', 'Glow Serum', 'Organic', 'Beauty'],
    images: [
      { image_url: '/assets/images/product_beauty_serum_1787668795039.jpg', alt_text: 'Serum Bottle' }
    ],
    variants: [
      { variant_type: 'Size', name: '30ml Dropper Bottle', value: '30ml', price_adjustment: 0, stock_quantity: 50 },
      { variant_type: 'Size', name: '50ml Value Pack', value: '50ml', price_adjustment: 900, stock_quantity: 30 }
    ]
  },
  {
    id: 'prod-nordic-lamp',
    title: 'Nordic Minimalist Mushroom Warm Glow Bedside Lamp',
    slug: 'nordic-minimalist-mushroom-warm-glow-bedside-lamp',
    description: 'Sleek Scandinavian dome lamp crafted with natural beech wood stem and matte-coated steel shade. Features 3-level touch dimming for relaxing ambient mood lighting, bedtime reading, and aesthetic desk setups.',
    category_id: 'cat-home-living',
    subcategory_id: 'sub-lighting',
    regular_price: 4200,
    sale_price: 2999,
    cost_price: 1400,
    is_featured: false,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 28,
    sku: 'ZVN-HOM-005',
    tags: ['Lamp', 'Home Decor', 'Lighting', 'Nordic', 'Minimalist'],
    images: [
      { image_url: '/assets/images/product_home_lamp_1787668839199.jpg', alt_text: 'Nordic Lamp in Bedroom' }
    ],
    variants: [
      { variant_type: 'Shade Color', name: 'Soft Cream Matte', value: '#fafaf9', price_adjustment: 0, stock_quantity: 18 },
      { variant_type: 'Shade Color', name: 'Midnight Charcoal', value: '#1e293b', price_adjustment: 0, stock_quantity: 10 }
    ]
  },
  {
    id: 'prod-ultra-smartwatch',
    title: 'Apex Ultra 2.0 HD AMOLED Bluetooth Calling Smart Watch',
    slug: 'apex-ultra-2-hd-amoled-bluetooth-calling-smart-watch',
    description: 'Flagship smartwatch with 2.02" edge-to-edge bright AMOLED display, IP68 water resistance, built-in speaker and mic for crystal-clear Bluetooth phone calls, 120+ sports tracking modes, heart rate and SpO2 sensors, with up to 7-day battery life.',
    category_id: 'cat-electronics',
    subcategory_id: 'sub-smart-watches',
    regular_price: 6999,
    sale_price: 4899,
    cost_price: 2400,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 40,
    sku: 'ZVN-ELE-006',
    tags: ['Smart Watch', 'Gadgets', 'AMOLED', 'Fitness', 'Electronics'],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80', alt_text: 'Apex Ultra Watch' }
    ],
    variants: [
      { variant_type: 'Color / Strap', name: 'Titanium Grey with Metallic Loop', value: 'titanium-grey', price_adjustment: 0, stock_quantity: 25 },
      { variant_type: 'Color / Strap', name: 'Obsidian Black with Silicone Strap', value: 'obsidian-black', price_adjustment: 0, stock_quantity: 15 }
    ]
  },
  {
    id: 'prod-leather-handbag',
    title: 'Elegance Textured Vegan Leather Crossbody Handbag',
    slug: 'elegance-textured-vegan-leather-crossbody-handbag',
    description: 'Chic everyday structured handbag crafted from premium scratch-resistant vegan leather with gold-tone hardware, secure magnetic zipper closure, organized dual interior compartments, and detachable shoulder strap.',
    category_id: 'cat-bags',
    subcategory_id: 'sub-handbags',
    regular_price: 4800,
    sale_price: 3299,
    cost_price: 1500,
    is_featured: false,
    is_bestseller: true,
    is_trending: false,
    is_active: true,
    stock_quantity: 30,
    sku: 'ZVN-BAG-007',
    tags: ['Handbag', 'Crossbody', 'Bags', 'Leather', 'Accessories'],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80', alt_text: 'Leather Handbag' }
    ],
    variants: [
      { variant_type: 'Color', name: 'Caramel Tan', value: '#b45309', price_adjustment: 0, stock_quantity: 16 },
      { variant_type: 'Color', name: 'Classic Black', value: '#0f172a', price_adjustment: 0, stock_quantity: 14 }
    ]
  },
  {
    id: 'prod-deal-anc-earbuds',
    title: 'SoundPro Active Noise-Cancelling True Wireless Earbuds',
    slug: 'soundpro-active-noise-cancelling-true-wireless-earbuds',
    description: 'Special promotional deal: High-fidelity deep bass drivers, active hybrid noise cancellation, dual-mic ENC for crystal-clear calls, wireless charging case with LED battery indicator, and 30-hour total playback.',
    category_id: 'cat-deals',
    subcategory_id: 'sub-special-offers',
    regular_price: 3499,
    sale_price: 1899,
    cost_price: 850,
    is_featured: true,
    is_bestseller: true,
    is_trending: true,
    is_active: true,
    stock_quantity: 60,
    sku: 'ZVN-DL-008',
    tags: ['Deals', 'Earbuds', 'ANC', 'Audio', 'Special Offer'],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80', alt_text: 'SoundPro Earbuds' }
    ],
    variants: [
      { variant_type: 'Color', name: 'Matte Black', value: '#0f172a', price_adjustment: 0, stock_quantity: 35 },
      { variant_type: 'Color', name: 'Frost White', value: '#ffffff', price_adjustment: 0, stock_quantity: 25 }
    ]
  }
];

async function seedDatabase() {
  console.log('[Seed] Starting Zavyaan Database Seeding...');
  try {
    // 1. Seed Categories
    console.log('[Seed] Seeding Categories...');
    for (const cat of initialCategories) {
      await db.saveCategory(cat);
    }
    console.log(`[Seed] Seeded ${initialCategories.length} categories.`);

    // 2. Seed Subcategories
    console.log('[Seed] Seeding Subcategories...');
    for (const sub of initialSubcategories) {
      await db.saveSubcategory(sub);
    }
    console.log(`[Seed] Seeded ${initialSubcategories.length} subcategories.`);

    // 3. Seed Sample Products
    console.log('[Seed] Seeding Sample Products...');
    for (const prod of sampleProducts) {
      await db.saveProduct(prod);
    }
    console.log(`[Seed] Seeded ${sampleProducts.length} sample products with variants and images.`);

    console.log('[Seed] Seeding completed successfully!');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = { seedDatabase, initialCategories, initialSubcategories, sampleProducts };
