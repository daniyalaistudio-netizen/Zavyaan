// ==========================================================
// ZAVYAAN ADMIN — BULK PRODUCT IMPORT & IMAGE UPLOADS
// ==========================================================
// Extends Admin (admin.js). Two modals reachable from the Products tab:
//   • Bulk Upload (CSV)  — template download, parse, preview, import, results
//   • Image Library      — drag & drop / choose files, upload, copy URL, delete
// plus a reusable "Upload" button used inside the Add / Edit Product forms.
// ==========================================================

const ImportUtils = {
  // CSV template columns — order matters for the download, names match what
  // POST /api/products/bulk accepts (it also tolerates common variants).
  TEMPLATE_COLUMNS: ['title', 'category', 'subcategory', 'regular_price', 'sale_price', 'cost_base', 'cost_shipping', 'cost_extra', 'stock_quantity', 'sku', 'image_url', 'description', 'tags', 'is_featured', 'is_bestseller', 'is_active'],
  TEMPLATE_EXAMPLE: {
    title: 'Royal Emerald Lawn Kurti', category: 'Fashion', subcategory: "Women's Clothing", regular_price: 5499, sale_price: 3899,
    cost_base: 2000, cost_shipping: 150, cost_extra: 200, stock_quantity: 40, sku: 'ZVN-FSH-010',
    image_url: 'kurti-front.jpg | kurti-back.jpg', description: 'Premium embroidered lawn kurti', tags: 'lawn|festive', is_featured: 'yes', is_bestseller: 'no', is_active: 'yes'
  },

  // RFC 4180-ish parser: quoted fields, escaped quotes, CRLF. Returns objects keyed by header.
  parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const src = String(text || '').replace(/^﻿/, '');
    for (let i = 0; i < src.length; i++) {
      const c = src[i], n = src[i + 1];
      if (inQuotes) {
        if (c === '"' && n === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && n === '\n') i++;
        row.push(field); field = '';
        if (row.some(v => v.trim() !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some(v => v.trim() !== '')) rows.push(row);
    if (rows.length < 2) return { headers: rows[0] || [], records: [] };
    const headers = rows[0].map(h => h.trim());
    const records = rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
    return { headers, records };
  },

  toCSV(rows, columns) {
    const q = (v) => { const s = String(v === undefined || v === null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [columns.join(','), ...rows.map(r => columns.map(c => q(r[c])).join(','))].join('\r\n');
  },

  downloadText(filename, text, mime = 'text/csv') {
    const blob = new Blob(['﻿' + text], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },

  readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read ' + file.name));
      r.readAsDataURL(file);
    });
  },

  readAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read ' + file.name));
      r.readAsText(file);
    });
  },

  human(bytes) { return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.round(bytes / 1024) + ' KB'; }
};

Object.assign(Admin, {
  bulkParsed: null,

  // ============================================================
  // BULK UPLOAD (CSV)
  // ============================================================
  openBulkUploadModal() {
    this.bulkParsed = null;
    const modal = document.getElementById('admin-modal');
    const body = document.getElementById('admin-modal-body');
    if (!modal || !body) return;
    body.innerHTML = `
      <h3 class="modal-title">Bulk Upload Products (CSV)</h3>
      <p class="modal-sub">Add or update many products at once. Existing products are matched by <strong>SKU</strong> (or by title if no SKU) and updated; new ones are created.</p>

      <ol class="bulk-steps">
        <li>
          <strong>Download the template</strong> and fill one product per row (Excel / Google Sheets → <em>Save as CSV</em>).
          <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="Admin.downloadBulkTemplate()">⬇ Download template (with example row)</button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="Admin.downloadCurrentProductsCSV()">⬇ Export current products</button>
          </div>
        </li>
        <li>
          <strong>Pictures:</strong> upload them first in <a href="javascript:void(0)" onclick="Admin.openImageLibrary()">Image Library</a>, then put the <em>file name</em> (e.g. <code>kurti-front.jpg</code>) or a full URL in <code>image_url</code>. Several images: separate with <code>|</code>.
        </li>
        <li>
          <strong>Choose your CSV file</strong>
          <input type="file" id="bulk-file" accept=".csv,text/csv" class="form-control" style="margin-top: 8px;" onchange="Admin.previewBulkFile(this.files[0])">
        </li>
      </ol>

      <div id="bulk-preview"></div>

      <div class="form-group" style="display: flex; gap: 22px; flex-wrap: wrap; margin-top: 14px;">
        <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="bulk-update" checked style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Update products that already exist (matched by SKU / title)</label>
        <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="bulk-create-cats" style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Create categories that don't exist yet</label>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Close</button>
        <button type="button" class="btn btn-primary" id="bulk-import-btn" disabled onclick="Admin.runBulkImport()">Import Products</button>
      </div>
    `;
    modal.classList.add('active');
  },

  downloadBulkTemplate() {
    const csv = ImportUtils.toCSV([ImportUtils.TEMPLATE_EXAMPLE], ImportUtils.TEMPLATE_COLUMNS);
    ImportUtils.downloadText('zavyaan-products-template.csv', csv);
  },

  async downloadCurrentProductsCSV() {
    try {
      const { products } = await API.getProducts({ all: true, limit: 1000 });
      const rows = products.map(p => ({
        title: p.title, category: p.category_name || '', subcategory: p.subcategory_name || '',
        regular_price: p.regular_price, sale_price: p.sale_price || '', cost_base: p.cost_base || '', cost_shipping: p.cost_shipping || '', cost_extra: p.cost_extra || '',
        stock_quantity: p.stock_quantity, sku: p.sku || '',
        image_url: (p.images || []).map(i => typeof i === 'string' ? i : i.image_url).join(' | '),
        description: p.description || '', tags: (p.tags || []).join('|'),
        is_featured: p.is_featured ? 'yes' : 'no', is_bestseller: p.is_bestseller ? 'yes' : 'no', is_active: p.is_active ? 'yes' : 'no'
      }));
      ImportUtils.downloadText(`zavyaan-products-${new Date().toISOString().slice(0, 10)}.csv`, ImportUtils.toCSV(rows, ImportUtils.TEMPLATE_COLUMNS));
    } catch (e) { alert('Export failed: ' + e.message); }
  },

  async previewBulkFile(file) {
    const box = document.getElementById('bulk-preview');
    const btn = document.getElementById('bulk-import-btn');
    if (!file) return;
    try {
      const text = await ImportUtils.readAsText(file);
      const { headers, records } = ImportUtils.parseCSV(text);
      this.bulkParsed = records;
      const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
      const norm = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const has = (...names) => headers.some(h => names.includes(norm(h)));
      const problems = [];
      if (!has('title', 'product', 'name', 'product_title')) problems.push('No "title" column.');
      if (!has('category', 'category_slug', 'category_name')) problems.push('No "category" column.');
      if (!has('regular_price', 'price')) problems.push('No "regular_price" column.');
      if (records.length === 0) problems.push('The file has no data rows.');
      if (records.length > 500) problems.push(`${records.length} rows — the limit is 500 per file.`);
      const show = headers.slice(0, 8);
      box.innerHTML = `
        <div class="bulk-preview-head">
          <strong>${esc(file.name)}</strong> · ${records.length} product row${records.length === 1 ? '' : 's'} · ${headers.length} columns
          ${problems.length ? `<div class="admin-error" style="margin-top: 8px; text-align: left; padding: 10px 14px;">${problems.map(p => '• ' + esc(p)).join('<br>')}</div>` : ''}
        </div>
        ${records.length ? `
        <div class="table-responsive" style="max-height: 220px; overflow: auto;">
          <table class="admin-table" style="font-size: 0.78rem;">
            <thead><tr><th>#</th>${show.map(h => `<th>${esc(h)}</th>`).join('')}${headers.length > 8 ? '<th>…</th>' : ''}</tr></thead>
            <tbody>${records.slice(0, 6).map((r, i) => `<tr><td>${i + 2}</td>${show.map(h => `<td class="items-cell" title="${esc(r[h])}">${esc(String(r[h]).slice(0, 40))}</td>`).join('')}${headers.length > 8 ? '<td>…</td>' : ''}</tr>`).join('')}</tbody>
          </table>
        </div>
        ${records.length > 6 ? `<div style="font-size: 0.76rem; color: var(--color-text-secondary); margin-top: 6px;">Showing first 6 of ${records.length} rows.</div>` : ''}` : ''}
      `;
      btn.disabled = problems.length > 0;
    } catch (e) {
      box.innerHTML = `<div class="admin-error">${Utils.escapeHtml(e.message)}</div>`;
      btn.disabled = true;
    }
  },

  async runBulkImport() {
    if (!this.bulkParsed || this.bulkParsed.length === 0) return;
    const btn = document.getElementById('bulk-import-btn');
    const box = document.getElementById('bulk-preview');
    btn.disabled = true; btn.textContent = `Importing ${this.bulkParsed.length} rows…`;
    try {
      const res = await API.request('/products/bulk', { method: 'POST', body: JSON.stringify({
        rows: this.bulkParsed,
        update_existing: document.getElementById('bulk-update').checked,
        create_categories: document.getElementById('bulk-create-cats').checked
      }) });
      const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
      const s = res.summary;
      box.innerHTML = `
        <div class="bulk-result-summary">
          <div><strong>${s.created}</strong><span>created</span></div>
          <div><strong>${s.updated}</strong><span>updated</span></div>
          <div class="${s.failed ? 'bad' : ''}"><strong>${s.failed}</strong><span>failed</span></div>
        </div>
        <div class="table-responsive" style="max-height: 260px; overflow: auto;">
          <table class="admin-table" style="font-size: 0.8rem;">
            <thead><tr><th>Line</th><th>Product</th><th>Result</th><th>Details</th></tr></thead>
            <tbody>${res.results.map(r => `
              <tr>
                <td>${r.line}</td>
                <td class="wrap-cell">${esc(r.title)}</td>
                <td><span class="status-pill status-${r.status === 'failed' ? 'cancelled' : (r.status === 'created' ? 'delivered' : 'confirmed')}">${r.status}</span></td>
                <td class="wrap-cell" style="font-size: 0.76rem; color: var(--color-text-secondary);">${esc(r.error || (r.warnings || []).join('; ') || '')}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>`;
      btn.textContent = 'Done';
      State.showToast(`Import finished: ${s.created} created, ${s.updated} updated, ${s.failed} failed.`);
      this.bulkParsed = null;
      await this.renderProducts();
      await this.refreshStorefrontNav();
    } catch (e) {
      alert('Import failed: ' + e.message);
      btn.disabled = false; btn.textContent = 'Import Products';
    }
  },

  // ============================================================
  // IMAGE LIBRARY
  // ============================================================
  async openImageLibrary(onPick = null) {
    this._imagePickCallback = onPick;
    const modal = document.getElementById('admin-modal');
    const body = document.getElementById('admin-modal-body');
    if (!modal || !body) return;
    body.innerHTML = `
      <h3 class="modal-title">Image Library</h3>
      <p class="modal-sub">Upload product pictures from your computer (JPEG, PNG, WebP, GIF · up to 5 MB each · up to 40 at a time). Each file keeps its name, so you can reference it in a bulk CSV as <code>file-name.jpg</code>. Uploading a file with the same name replaces it.</p>
      <div class="sku-howto">
        <strong>Fastest way to add pictures to many products:</strong> name each file with the product's <strong>SKU</strong> —
        <code>ZVN-FSH-001.jpg</code> is the main picture of SKU ZVN-FSH-001, <code>ZVN-FSH-001-2.jpg</code> the second, <code>-3</code> the third…
        Upload them all here and they attach to the right products automatically.
      </div>
      <div class="dropzone" id="img-dropzone" ondragover="event.preventDefault(); this.classList.add('over');" ondragleave="this.classList.remove('over');" ondrop="event.preventDefault(); this.classList.remove('over'); Admin.uploadImages(event.dataTransfer.files);">
        <div>📁 Drag &amp; drop images here</div>
        <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin: 6px 0 10px;">or</div>
        <label class="btn btn-primary btn-sm" style="cursor: pointer;">Choose files<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" hidden onchange="Admin.uploadImages(this.files); this.value='';"></label>
      </div>
      <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
        <label style="display: flex; gap: 8px; align-items: center; font-size: 0.82rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="img-auto-attach" checked style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Attach to products by SKU after upload</label>
        <label style="display: flex; gap: 8px; align-items: center; font-size: 0.82rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="img-replace" style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Replace a product's existing pictures (instead of adding)</label>
        <button type="button" class="btn btn-sm btn-secondary" onclick="Admin.attachImagesBySku()">🔗 Attach all by SKU now</button>
      </div>
      <div id="img-upload-status"></div>
      <div id="img-library-grid" class="admin-loading">Loading library…</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Close</button>
      </div>
    `;
    modal.classList.add('active');
    await this.refreshImageLibrary();
  },

  async refreshImageLibrary() {
    const grid = document.getElementById('img-library-grid');
    if (!grid) return;
    try {
      const { files } = await API.request('/uploads/images');
      const esc = (v) => Utils.escapeHtml(String(v || ''));
      grid.className = 'img-grid';
      grid.innerHTML = files.length ? files.map(f => `
        <figure class="img-tile" title="${esc(f.name)} · ${ImportUtils.human(f.bytes)}">
          <img src="${esc(f.url)}" alt="${esc(f.name)}" loading="lazy">
          <figcaption>${esc(f.name)}</figcaption>
          <div class="img-tile-actions">
            ${this._imagePickCallback ? `<button class="btn btn-sm btn-gold" onclick="Admin.pickLibraryImage('${esc(f.url)}')">Use</button>` : ''}
            <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard && navigator.clipboard.writeText('${esc(f.url)}'); State.showToast('URL copied: ${esc(f.url)}');">Copy URL</button>
            <button class="btn btn-sm btn-secondary" onclick="Admin.deleteLibraryImage('${esc(f.name)}')">🗑</button>
          </div>
        </figure>`).join('') : `<div class="empty-cell" style="grid-column: 1 / -1;">No images uploaded yet.</div>`;
    } catch (e) {
      grid.className = 'admin-error';
      grid.textContent = e.message;
    }
  },

  async uploadImages(fileList) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    const status = document.getElementById('img-upload-status');
    if (files.length === 0) { if (status) status.innerHTML = `<div class="admin-error">No image files selected.</div>`; return; }
    if (status) status.innerHTML = `<div class="admin-loading">Uploading ${files.length} image${files.length === 1 ? '' : 's'}…</div>`;
    try {
      const payload = [];
      for (const f of files.slice(0, 40)) payload.push({ filename: f.name, data: await ImportUtils.readAsDataURL(f) });
      const res = await API.request('/uploads/images', { method: 'POST', body: JSON.stringify({ files: payload }) });
      const esc = (v) => Utils.escapeHtml(String(v || ''));
      if (status) status.innerHTML = `
        <div class="bulk-result-summary" style="margin-top: 10px;">
          <div><strong>${res.uploaded.length}</strong><span>uploaded</span></div>
          <div class="${res.failed.length ? 'bad' : ''}"><strong>${res.failed.length}</strong><span>rejected</span></div>
        </div>
        ${res.failed.length ? `<div class="admin-error" style="text-align: left; padding: 10px 14px;">${res.failed.map(f => `• ${esc(f.name)} — ${esc(f.error)}`).join('<br>')}</div>` : ''}
        ${res.uploaded.length ? `<div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 6px;">Use these names in your CSV: ${res.uploaded.map(f => `<code>${esc(f.name)}</code>`).join(', ')}</div>` : ''}`;
      State.showToast(`${res.uploaded.length} image${res.uploaded.length === 1 ? '' : 's'} uploaded.`);
      await this.refreshImageLibrary();
      const auto = document.getElementById('img-auto-attach');
      if (res.uploaded.length && (!auto || auto.checked)) await this.attachImagesBySku(true);
    } catch (e) {
      if (status) status.innerHTML = `<div class="admin-error">${Utils.escapeHtml(e.message)}</div>`;
    }
  },

  // Match every uploaded file named <SKU>.jpg / <SKU>-2.jpg to its product.
  async attachImagesBySku(append = false) {
    const status = document.getElementById('img-upload-status');
    const replaceEl = document.getElementById('img-replace');
    try {
      const r = await API.request('/uploads/attach-by-sku', { method: 'POST', body: JSON.stringify({ replace: Boolean(replaceEl && replaceEl.checked) }) });
      const esc = (v) => Utils.escapeHtml(String(v || ''));
      const html = `
        <div class="sku-attach-result">
          <div class="bulk-result-summary" style="margin: 10px 0;">
            <div><strong>${r.products_updated}</strong><span>products got pictures</span></div>
            <div><strong>${r.images_added}</strong><span>pictures attached</span></div>
            <div class="${r.unmatched_files.length ? 'bad' : ''}"><strong>${r.unmatched_files.length}</strong><span>files match no SKU</span></div>
            <div class="${r.products_without_images.length ? 'bad' : ''}"><strong>${r.products_without_images.length}</strong><span>products still without a picture</span></div>
          </div>
          ${r.attached.length ? `<div class="sku-list">${r.attached.map(a => `<span title="${esc(a.title)}"><strong>${esc(a.sku)}</strong> → ${esc(a.title.slice(0, 34))}${a.title.length > 34 ? '…' : ''} (${a.images} pic${a.images === 1 ? '' : 's'})</span>`).join('')}</div>` : ''}
          ${r.unmatched_files.length ? `<div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 6px;">Not matched to any SKU (rename to the SKU and re-upload, or use them by URL): ${r.unmatched_files.map(f => `<code>${esc(f)}</code>`).join(' ')}</div>` : ''}
          ${r.products_without_images.length ? `<div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 6px;">Still need a picture — name the file exactly like this: ${r.products_without_images.slice(0, 12).map(p => `<code>${esc(p.sku || '(no SKU) ' + p.title)}.jpg</code>`).join(' ')}${r.products_without_images.length > 12 ? ' …' : ''}</div>` : ''}
        </div>`;
      if (status) status.innerHTML = append ? status.innerHTML + html : html;
      State.showToast(`${r.images_added} picture${r.images_added === 1 ? '' : 's'} attached to ${r.products_updated} product${r.products_updated === 1 ? '' : 's'}.`);
      if (this.currentTab === 'products') this.renderProducts();
    } catch (e) {
      if (status) status.innerHTML = `<div class="admin-error">${Utils.escapeHtml(e.message)}</div>`;
    }
  },

  async deleteLibraryImage(name) {
    if (!confirm(`Delete ${name}? Products using it will show a broken picture until you set another one.`)) return;
    try { await API.request(`/uploads/images/${encodeURIComponent(name)}`, { method: 'DELETE' }); await this.refreshImageLibrary(); }
    catch (e) { alert(e.message); }
  },

  pickLibraryImage(url) {
    if (typeof this._imagePickCallback === 'function') this._imagePickCallback(url);
    this._imagePickCallback = null;
  },

  // ---- Single-image upload button used inside product forms ----
  // Uploads the chosen file and writes the URL into the given input.
  async uploadIntoField(inputId, fileInput) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const input = document.getElementById(inputId);
    const preview = document.getElementById(inputId + '-preview');
    const label = fileInput.closest('label');
    const origText = label ? label.textContent : '';
    if (label) label.textContent = 'Uploading…';
    try {
      const data = await ImportUtils.readAsDataURL(file);
      const res = await API.request('/uploads/image', { method: 'POST', body: JSON.stringify({ filename: file.name, data }) });
      if (input) input.value = res.file.url;
      if (preview) { preview.src = res.file.url; preview.hidden = false; }
      State.showToast(`Uploaded ${res.file.name}${res.file.replaced ? ' (replaced existing file)' : ''}.`);
    } catch (e) {
      alert('Upload failed: ' + e.message);
    } finally {
      if (label) label.textContent = origText;
      fileInput.value = '';
    }
  },

  // Markup for an image field: URL box + Upload button + preview
  imageField(inputId, value = '') {
    const esc = (v) => Utils.escapeHtml(String(v || ''));
    return `
      <div class="form-group">
        <label class="form-label">Product image</label>
        <div class="image-field">
          <img id="${inputId}-preview" src="${esc(value)}" alt="" ${value ? '' : 'hidden'} onerror="this.hidden = true;">
          <div style="flex: 1; min-width: 0;">
            <input type="text" id="${inputId}" class="form-control" placeholder="Paste an image URL, or upload from your computer →" value="${esc(value)}" oninput="const p = document.getElementById('${inputId}-preview'); p.src = this.value; p.hidden = !this.value;">
            <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
              <label class="btn btn-sm btn-gold" style="cursor: pointer;">⬆ Upload from computer<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onchange="Admin.uploadIntoField('${inputId}', this)"></label>
              <span style="font-size: 0.74rem; color: var(--color-text-secondary); align-self: center;">JPEG / PNG / WebP · max 5 MB</span>
            </div>
          </div>
        </div>
      </div>`;
  }
});
