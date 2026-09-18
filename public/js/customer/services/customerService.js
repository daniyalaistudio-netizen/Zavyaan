// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — CUSTOMER PROFILE & ADDRESSES
// ==========================================================

const CustomerService = {
  addressStorageKey: 'zavyaan_customer_addresses',

  // Get customer profile
  async getProfile() {
    return AuthService.getCurrentUser();
  },

  // Update customer profile
  async updateProfile(updates) {
    const current = AuthService.getCurrentUser() || {};
    const updated = { ...current, ...updates };
    localStorage.setItem(AuthService.userKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('customer-auth-changed', { detail: updated }));
    return updated;
  },

  // Get saved delivery addresses
  getSavedAddresses() {
    try {
      const stored = localStorage.getItem(this.addressStorageKey);
      return stored ? JSON.parse(stored) : [
        {
          id: 'addr-default',
          name: 'Home',
          recipient: 'Ali Khan',
          phone: '03001234567',
          province: 'Punjab',
          city: 'Lahore',
          address: 'House 42, Street 8, DHA Phase 5',
          is_default: true
        }
      ];
    } catch {
      return [];
    }
  },

  // Save new delivery address
  saveAddress(addr) {
    const addresses = this.getSavedAddresses();
    const id = addr.id || 'addr-' + Date.now();
    const newAddr = { ...addr, id };

    if (newAddr.is_default) {
      addresses.forEach(a => a.is_default = false);
    }

    const idx = addresses.findIndex(a => a.id === id);
    if (idx >= 0) {
      addresses[idx] = newAddr;
    } else {
      addresses.push(newAddr);
    }

    localStorage.setItem(this.addressStorageKey, JSON.stringify(addresses));
    return addresses;
  },

  // Delete saved delivery address
  deleteAddress(id) {
    const addresses = this.getSavedAddresses().filter(a => a.id !== id);
    localStorage.setItem(this.addressStorageKey, JSON.stringify(addresses));
    return addresses;
  },

  // Customer order history
  async getCustomerOrders() {
    try {
      const res = await (window.ApiClient || window.API).request('/customer/orders');
      return res.orders || [];
    } catch {
      const allOrders = JSON.parse(localStorage.getItem('zavyaan_local_orders') || '[]');
      const user = AuthService.getCurrentUser();
      if (!user) return allOrders.slice(0, 5);
      return allOrders.filter(o => 
        (user.email && o.customer_email === user.email) || 
        (user.phone && o.customer_phone === user.phone)
      );
    }
  }
};

window.CustomerService = CustomerService;
