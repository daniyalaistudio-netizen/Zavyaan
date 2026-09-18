// ==========================================================
// ZAVYAAN CUSTOMER PAGES — CONTENT & INFORMATIONAL PAGES
// About, Contact Us, FAQ, and Legal Policies
// ==========================================================

const ContentPages = {
  renderAbout(container) {
    container.innerHTML = `
      <div class="container section-padding" style="max-width: 860px;">
        <div class="section-tagline">About Zavyaan</div>
        <h1 style="font-size: 2.6rem; color: var(--color-rich-black); margin-bottom: 12px;">Discover More. Live Better.</h1>
        <p style="font-size: 1.05rem; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 28px;">
          <strong>Zavyaan</strong> is Pakistan's premier online multi-category destination, thoughtfully curated for discerning shoppers across festive fashion, artisanal jewellery, STEM educational toys, organic skincare, aesthetic home living, and smart electronics with nationwide Cash on Delivery.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 36px 0;">
          <div style="background: var(--color-pure-white); padding: 24px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-light);">
            <h3 style="color: var(--color-rich-black); margin-bottom: 8px; font-size: 1.15rem;">Our Mission</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">To build Pakistan's most reliable and elegant e-commerce brand through strict quality inspection, honest PKR pricing, and responsive customer support.</p>
          </div>
          <div style="background: var(--color-pure-white); padding: 24px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-light);">
            <h3 style="color: var(--color-gold-muted); margin-bottom: 8px; font-size: 1.15rem;">The Zavyaan Promise</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">100% Cash on Delivery across Pakistan, 7-day hassle-free exchange, and dedicated live WhatsApp care.</p>
          </div>
        </div>
      </div>
    `;
  },

  renderContact(container) {
    container.innerHTML = `
      <div class="container section-padding" style="max-width: 760px;">
        <div class="section-tagline">Customer Care</div>
        <h1 style="font-size: 2.4rem; color: var(--color-rich-black); margin-bottom: 8px;">Contact Zavyaan Support</h1>
        <p style="color: var(--color-text-secondary); margin-bottom: 30px;">Have questions regarding sizing, courier status, or bulk inquiries? Our team is available 6 days a week.</p>

        <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: 32px;">
          <form onsubmit="event.preventDefault(); CustomerState.showToast('Message received! Our customer care team will message you shortly.'); this.reset();">
            <div class="form-group">
              <label class="form-label">Full Name <span class="req">*</span></label>
              <input type="text" class="form-control" placeholder="Your name" required>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Calling / WhatsApp Number <span class="req">*</span></label>
                <input type="tel" class="form-control" placeholder="0300 1234567" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-control" placeholder="yourname@gmail.com">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Inquiry Details <span class="req">*</span></label>
              <textarea class="form-control" rows="4" placeholder="How can we assist your shopping experience?" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-lg">Send Message &rarr;</button>
          </form>
        </div>
      </div>
    `;
  },

  renderFaq(container) {
    const faqs = [
      { q: 'How does Cash on Delivery (COD) work?', a: 'You place your order online without advance payment. When the courier delivers your parcel, you pay the rider in cash at your doorstep.' },
      { q: 'What is the delivery time across Pakistan?', a: 'Major cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad) receive deliveries within 2 to 3 business days. Other regional cities take 3 to 5 business days.' },
      { q: 'What are the delivery charges?', a: 'Delivery is 100% FREE on all orders over Rs. 2,500! Orders below Rs. 2,500 carry a flat delivery fee of Rs. 200 nationwide.' },
      { q: 'How does the Rs. 100 Advance Payment discount work?', a: 'When checking out, select "Advance Payment". Rs. 100 is automatically deducted from your order total! You can pay via JazzCash, Easypaisa, or Online Bank Transfer.' },
      { q: 'How do I exchange or return an item?', a: 'We provide a 7-day hassle-free return and exchange policy. Simply message our WhatsApp customer service with your Order Number to arrange an exchange.' }
    ];

    container.innerHTML = `
      <div class="container section-padding" style="max-width: 800px;">
        <div class="section-tagline">Help Center</div>
        <h1 style="font-size: 2.4rem; color: var(--color-rich-black); margin-bottom: 12px;">Frequently Asked Questions</h1>
        <div class="faq-accordion">
          ${faqs.map(f => `
            <div class="faq-item">
              <h3 class="faq-question">Q: ${f.q}</h3>
              <p class="faq-answer">${f.a}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderPolicy(container, type) {
    const policies = {
      'shipping-policy': {
        title: 'Shipping & Delivery Policy',
        content: 'Zavyaan delivers across Pakistan using premier courier services. Orders are processed within 24 hours of confirmation. Delivery takes 2-4 business days. Free delivery is automatically applied to all orders above Rs. 2,500.'
      },
      'returns-policy': {
        title: 'Return & Exchange Policy',
        content: 'Your satisfaction is our priority. If you receive a damaged item or incorrect size, contact us on WhatsApp within 7 days of delivery with original packaging intact. We will arrange a replacement or prompt refund.'
      },
      'privacy-policy': {
        title: 'Privacy Policy',
        content: 'Zavyaan is committed to customer privacy. Contact details, phone numbers, and shipping addresses are collected solely to deliver and communicate your order statuses safely.'
      },
      'terms': {
        title: 'Terms & Conditions',
        content: 'By placing an order on Zavyaan, you agree to receive SMS/WhatsApp order tracking updates and make full payment upon Cash on Delivery arrival.'
      }
    };

    const pol = policies[type] || policies['shipping-policy'];

    container.innerHTML = `
      <div class="container section-padding" style="max-width: 800px;">
        <div class="section-tagline">Store Policy</div>
        <h1 style="font-size: 2.3rem; color: var(--color-rich-black); margin-bottom: 16px;">${pol.title}</h1>
        <div class="content-page-card">
          <p>${pol.content}</p>
        </div>
      </div>
    `;
  }
};

window.ContentPages = ContentPages;
