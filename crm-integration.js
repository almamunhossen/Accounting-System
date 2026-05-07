/**
 * PROFESSIONAL CRM + SUPPLIER MANAGEMENT SYSTEM
 * Frontend Integration Module
 * Place this in a new file: crm-integration.js
 * Include it in index.html AFTER api.js but BEFORE app.js
 */

// ==================== CRM DATA MODELS ====================
const CRMModels = {
  // Customer data structure
  Customer: {
    id: '',
    name: '',
    phone: '',
    email: '',
    company: '',
    vat: '',
    address: '',
    tag: 'New', // VIP, Regular, New, Pending
    credit_limit: 0,
    payment_terms: 30, // 7, 15, 30, 45, 60, 90
    opening_balance: 0,
    opening_balance_type: 'Dr', // Dr, Cr
    total_purchase: 0,
    total_paid: 0,
    due_amount: 0,
    status: 'Active', // Active, Inactive
    customer_type: 'Individual', // Individual, Company
    created_date: new Date().toISOString(),
    last_contact: '',
    notes: ''
  },

  // Supplier data structure
  Supplier: {
    id: '',
    name: '',
    phone: '',
    email: '',
    company: '',
    vat: '',
    address: '',
    payment_terms: 30,
    bank_name: '',
    bank_account: '',
    contact_person: '',
    total_purchase: 0,
    total_paid: 0,
    due_amount: 0,
    status: 'Active', // Active, Inactive
    created_date: new Date().toISOString(),
    notes: ''
  },

  // Transaction data structure
  Transaction: {
    id: '',
    customer_id: '',
    supplier_id: '',
    type: 'Invoice', // Invoice, Payment, Credit Note, Adjustment
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    invoice_id: '',
    purchase_id: '',
    note: '',
    created_date: new Date().toISOString()
  },

  // Contact log data structure
  Contact: {
    id: '',
    customer_id: '',
    type: 'Note', // Call, WhatsApp, Email, SMS, Visit, Note
    message: '',
    date: new Date().toISOString().split('T')[0],
    created_date: new Date().toISOString()
  }
};

// ==================== CRM API CLIENT ====================
const CRMClient = {
  // Enable/Disable debug logging
  debug: false,

  _log(message, data = null) {
    if (this.debug) {
      console.log(`[CRM] ${message}`, data || '');
    }
  },

  // ========== CUSTOMER OPERATIONS ==========
  
  async getCustomers(filters = {}) {
    this._log('Fetching customers with filters', filters);
    try {
      const data = await APIClient.getData('getCustomers', filters);
      return data || [];
    } catch (error) {
      this._log('Error fetching customers', error);
      throw error;
    }
  },

  async getCustomerById(customerId) {
    this._log('Fetching customer', customerId);
    try {
      return await APIClient.getData('getCustomerById', { customer_id: customerId });
    } catch (error) {
      this._log('Error fetching customer', error);
      throw error;
    }
  },

  async addCustomer(customerData) {
    this._log('Adding customer', customerData);
    try {
      const result = await APIClient.postData('addCustomer', customerData);
      if (result.success) {
        APIClient.showToast('Customer added successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error adding customer', error);
      APIClient.showToast('Failed to add customer: ' + error.message, 'error');
      throw error;
    }
  },

  async updateCustomer(customerId, updates) {
    this._log('Updating customer', { customerId, updates });
    try {
      const result = await APIClient.postData('updateCustomer', {
        customer_id: customerId,
        ...updates
      });
      if (result.success) {
        APIClient.showToast('Customer updated successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error updating customer', error);
      APIClient.showToast('Failed to update customer: ' + error.message, 'error');
      throw error;
    }
  },

  async deleteCustomer(customerId) {
    this._log('Deleting customer', customerId);
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }
    try {
      const result = await APIClient.postData('deleteCustomer', { customer_id: customerId });
      if (result.success) {
        APIClient.showToast('Customer deleted successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error deleting customer', error);
      APIClient.showToast('Failed to delete customer: ' + error.message, 'error');
      throw error;
    }
  },

  // ========== SUPPLIER OPERATIONS ==========

  async getSuppliers(filters = {}) {
    this._log('Fetching suppliers with filters', filters);
    try {
      const data = await APIClient.getData('getSuppliers', filters);
      return data || [];
    } catch (error) {
      this._log('Error fetching suppliers', error);
      throw error;
    }
  },

  async getSupplierById(supplierId) {
    this._log('Fetching supplier', supplierId);
    try {
      return await APIClient.getData('getSupplierById', { supplier_id: supplierId });
    } catch (error) {
      this._log('Error fetching supplier', error);
      throw error;
    }
  },

  async addSupplier(supplierData) {
    this._log('Adding supplier', supplierData);
    try {
      const result = await APIClient.postData('addSupplier', supplierData);
      if (result.success) {
        APIClient.showToast('Supplier added successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error adding supplier', error);
      APIClient.showToast('Failed to add supplier: ' + error.message, 'error');
      throw error;
    }
  },

  async updateSupplier(supplierId, updates) {
    this._log('Updating supplier', { supplierId, updates });
    try {
      const result = await APIClient.postData('updateSupplier', {
        supplier_id: supplierId,
        ...updates
      });
      if (result.success) {
        APIClient.showToast('Supplier updated successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error updating supplier', error);
      APIClient.showToast('Failed to update supplier: ' + error.message, 'error');
      throw error;
    }
  },

  async deleteSupplier(supplierId) {
    this._log('Deleting supplier', supplierId);
    if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      return;
    }
    try {
      const result = await APIClient.postData('deleteSupplier', { supplier_id: supplierId });
      if (result.success) {
        APIClient.showToast('Supplier deleted successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error deleting supplier', error);
      APIClient.showToast('Failed to delete supplier: ' + error.message, 'error');
      throw error;
    }
  },

  // ========== TRANSACTION OPERATIONS ==========

  async recordCustomerTransaction(customerId, transactionData) {
    this._log('Recording customer transaction', { customerId, transactionData });
    try {
      const result = await APIClient.postData('addCustomerTransaction', {
        customer_id: customerId,
        ...transactionData
      });
      if (result.success) {
        APIClient.showToast('Transaction recorded successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error recording transaction', error);
      APIClient.showToast('Failed to record transaction: ' + error.message, 'error');
      throw error;
    }
  },

  async getCustomerTransactions(customerId) {
    this._log('Fetching customer transactions', customerId);
    try {
      const data = await APIClient.getData('getCustomerTransactions', { customer_id: customerId });
      return data || [];
    } catch (error) {
      this._log('Error fetching transactions', error);
      throw error;
    }
  },

  async recordSupplierTransaction(supplierId, transactionData) {
    this._log('Recording supplier transaction', { supplierId, transactionData });
    try {
      const result = await APIClient.postData('addSupplierTransaction', {
        supplier_id: supplierId,
        ...transactionData
      });
      if (result.success) {
        APIClient.showToast('Transaction recorded successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error recording supplier transaction', error);
      APIClient.showToast('Failed to record transaction: ' + error.message, 'error');
      throw error;
    }
  },

  async getSupplierTransactions(supplierId) {
    this._log('Fetching supplier transactions', supplierId);
    try {
      const data = await APIClient.getData('getSupplierTransactions', { supplier_id: supplierId });
      return data || [];
    } catch (error) {
      this._log('Error fetching supplier transactions', error);
      throw error;
    }
  },

  // ========== CONTACT LOG OPERATIONS ==========

  async logCustomerContact(customerId, contactData) {
    this._log('Logging customer contact', { customerId, contactData });
    try {
      const result = await APIClient.postData('addCustomerContact', {
        customer_id: customerId,
        ...contactData
      });
      if (result.success) {
        APIClient.showToast('Contact logged successfully', 'success');
      }
      return result;
    } catch (error) {
      this._log('Error logging contact', error);
      APIClient.showToast('Failed to log contact: ' + error.message, 'error');
      throw error;
    }
  },

  async getCustomerContacts(customerId) {
    this._log('Fetching customer contacts', customerId);
    try {
      const data = await APIClient.getData('getCustomerContacts', { customer_id: customerId });
      return data || [];
    } catch (error) {
      this._log('Error fetching contacts', error);
      throw error;
    }
  },

  // ========== ANALYTICS ==========

  async getCustomerStatistics() {
    this._log('Fetching customer statistics');
    try {
      return await APIClient.getData('getCustomerStatistics');
    } catch (error) {
      this._log('Error fetching customer statistics', error);
      throw error;
    }
  },

  async getSupplierStatistics() {
    this._log('Fetching supplier statistics');
    try {
      return await APIClient.getData('getSupplierStatistics');
    } catch (error) {
      this._log('Error fetching supplier statistics', error);
      throw error;
    }
  }
};

// ==================== FINANCIAL CALCULATORS ====================
const CRMCalculations = {
  // Calculate due amount for customer
  calculateCustomerDue(customer) {
    const opening = customer.opening_balance_type === 'Cr' 
      ? -customer.opening_balance 
      : customer.opening_balance;
    const total = opening + (customer.total_purchase || 0) - (customer.total_paid || 0);
    return Math.max(0, total);
  },

  // Calculate due amount for supplier
  calculateSupplierDue(supplier) {
    return Math.max(0, (supplier.total_purchase || 0) - (supplier.total_paid || 0));
  },

  // Calculate payment status
  getPaymentStatus(customer) {
    const due = this.calculateCustomerDue(customer);
    if (due <= 0) return 'Paid';
    const daysOutstanding = this.getDaysOverdue(customer.last_contact);
    if (daysOutstanding > 30) return 'Overdue';
    return 'Pending';
  },

  // Calculate days overdue
  getDaysOverdue(lastContactDate) {
    if (!lastContactDate) return 0;
    const lastDate = new Date(lastContactDate);
    const today = new Date();
    const diffTime = today - lastDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  // Calculate credit utilization percentage
  getCreditUtilization(customer) {
    if (customer.credit_limit <= 0) return 0;
    const due = this.calculateCustomerDue(customer);
    return Math.min(100, (due / customer.credit_limit) * 100);
  },

  // Check if customer is within credit limit
  isWithinCreditLimit(customer) {
    return this.calculateCustomerDue(customer) <= customer.credit_limit;
  },

  // Format financial values
  formatMoney(value, currency = 'SAR') {
    const symbols = { SAR: 'SAR', BDT: '৳', USD: '$' };
    const num = parseFloat(value) || 0;
    return `${symbols[currency] || currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

// ==================== ENHANCED UI HELPERS ====================
const CRMUIHelpers = {
  // Get tag color
  getTagColor(tag) {
    const colors = {
      'VIP': '#FFD700', // Gold
      'Regular': '#4CAF50', // Green
      'New': '#2196F3', // Blue
      'Pending': '#FF9800' // Orange
    };
    return colors[tag] || '#999';
  },

  // Get status badge HTML
  getStatusBadge(status) {
    const colors = {
      'Active': '#4CAF50',
      'Inactive': '#f44336'
    };
    const color = colors[status] || '#999';
    return `<span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">${status}</span>`;
  },

  // Get payment status badge
  getPaymentStatusBadge(status) {
    const colors = {
      'Paid': '#4CAF50',
      'Pending': '#2196F3',
      'Overdue': '#f44336'
    };
    const color = colors[status] || '#999';
    return `<span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${status}</span>`;
  },

  // Format date
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  // Get credit utilization bar
  getCreditUtilizationBar(utilization) {
    const width = Math.min(100, utilization);
    let color = '#4CAF50'; // Green
    if (utilization > 80) color = '#f44336'; // Red
    else if (utilization > 60) color = '#FF9800'; // Orange
    
    return `<div style="background: #eee; border-radius: 4px; height: 6px; overflow: hidden;">
      <div style="background: ${color}; width: ${width}%; height: 100%; transition: width 0.3s;"></div>
    </div>
    <small style="color: #666;">${utilization.toFixed(1)}%</small>`;
  }
};

// ==================== EXPORT HELPERS ====================
const CRMExport = {
  // Export customers to Excel
  exportCustomersToExcel(customers, filename = 'customers.xlsx') {
    if (!window.XLSX) {
      alert('SheetJS library not loaded. Please ensure xlsx is included.');
      return;
    }

    const data = customers.map(c => ({
      'ID': c.id,
      'Name': c.name,
      'Phone': c.phone,
      'Email': c.email,
      'Company': c.company,
      'VAT': c.vat,
      'Tag': c.tag,
      'Status': c.status,
      'Credit Limit': c.credit_limit,
      'Total Purchase': c.total_purchase,
      'Total Paid': c.total_paid,
      'Due Amount': c.due_amount,
      'Payment Terms': c.payment_terms + ' days',
      'Last Contact': c.last_contact || '-'
    }));

    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    window.XLSX.writeFile(wb, filename);
    APIClient.showToast('Customers exported to Excel', 'success');
  },

  // Export suppliers to Excel
  exportSuppliersToExcel(suppliers, filename = 'suppliers.xlsx') {
    if (!window.XLSX) {
      alert('SheetJS library not loaded. Please ensure xlsx is included.');
      return;
    }

    const data = suppliers.map(s => ({
      'ID': s.id,
      'Name': s.name,
      'Phone': s.phone,
      'Email': s.email,
      'Company': s.company,
      'VAT': s.vat,
      'Status': s.status,
      'Total Purchase': s.total_purchase,
      'Total Paid': s.total_paid,
      'Due Amount': s.due_amount,
      'Payment Terms': s.payment_terms + ' days',
      'Contact Person': s.contact_person || '-'
    }));

    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
    window.XLSX.writeFile(wb, filename);
    APIClient.showToast('Suppliers exported to Excel', 'success');
  },

  // Export customer statement as PDF
  async exportCustomerStatement(customer, transactions) {
    if (!window.html2pdf) {
      alert('html2pdf library not loaded. Please ensure it is included.');
      return;
    }

    const statementHTML = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Customer Statement</h2>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>Customer Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Name:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${customer.name}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Company:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${customer.company}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Phone:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${customer.phone}</td></tr>
          <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Email:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${customer.email}</td></tr>
        </table>

        <h3 style="margin-top: 20px;">Financial Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f0f0f0;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Purchase</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${CRMCalculations.formatMoney(customer.total_purchase)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Paid</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${CRMCalculations.formatMoney(customer.total_paid)}</td>
          </tr>
          <tr style="background: #f0f0f0; font-weight: bold;">
            <td style="border: 1px solid #ddd; padding: 8px;">Due Amount</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${CRMCalculations.formatMoney(customer.due_amount)}</td>
          </tr>
        </table>

        <h3 style="margin-top: 20px;">Transaction History</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Type</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Note</th>
          </tr>
          ${transactions.map(t => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${CRMUIHelpers.formatDate(t.date)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${t.type}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${CRMCalculations.formatMoney(t.amount)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${t.note || '-'}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = statementHTML;

    const opt = {
      margin: 10,
      filename: `statement_${customer.name}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
    APIClient.showToast('Statement exported as PDF', 'success');
  }
};

// ==================== INITIALIZE CRM ====================
function initializeCRM() {
  console.log('CRM Integration Module Loaded');
  console.log('Available: CRMClient, CRMModels, CRMCalculations, CRMUIHelpers, CRMExport');
  
  // Enable debug mode if needed
  // CRMClient.debug = true;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCRM);
} else {
  initializeCRM();
}
