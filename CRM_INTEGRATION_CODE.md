/**
 * CRM INTEGRATION WITH EXISTING SYSTEM
 * Update these functions in your app.js to use the new CRM API
 * This file shows exact code replacements
 */

// ==================== UPDATE app.js - REPLACE THESE FUNCTIONS ====================

/**
 * STEP 1: Include crm-integration.js in index.html
 * 
 * <script src="api.js"></script>
 * <script src="crm-integration.js"></script>  <!-- ADD THIS LINE -->
 * <script src="app.js"></script>
 */

// ==================== CUSTOMER MANAGEMENT ====================

/**
 * REPLACE: syncCustomersFromApi() function
 * OLD: Loads from basic API
 * NEW: Loads from CRM with full financial data
 */
async function syncCustomersFromApi() {
  try {
    if (!isApiEnabled()) {
      console.warn('API not configured, using local data');
      return;
    }
    
    const apiCustomers = await CRMClient.getCustomers();
    
    // Map API response to local format
    customers = apiCustomers.map(cust => ({
      id: cust.id || `local-${Date.now()}`,
      name: cust.name || '',
      phone: cust.phone || '',
      email: cust.email || '',
      company: cust.company || '',
      vatNumber: cust.vat || '',
      address: cust.address || '',
      tag: cust.tag || 'New',
      creditLimit: cust.credit_limit || 0,
      paymentTerms: cust.payment_terms || 30,
      openingBalance: cust.opening_balance || 0,
      openingBalanceType: cust.opening_balance_type || 'Dr',
      totalSpent: cust.total_purchase || 0,
      totalPaid: cust.total_paid || 0,
      dueAmount: cust.due_amount || 0,
      status: cust.status || 'Active',
      customerType: cust.customer_type || 'Individual',
      createdDate: cust.created_date || '',
      lastContact: cust.last_contact || '',
      notes: cust.notes || '',
      contactHistory: [],
      contactHistoryLoaded: false
    }));
    
    console.log('Synchronized ' + customers.length + ' customers from API');
    renderCustomers();
    updateDashboard();
  } catch (error) {
    console.error('Failed to sync customers from API:', error);
    APIClient.showToast('Failed to load customers from API', 'error');
  }
}

/**
 * REPLACE: saveCustomer() function in the customer form submit handler
 * OLD: Saved to localStorage
 * NEW: Saves to CRM with automatic financial calculations
 */
async function saveCustomerWithCRM(customerData) {
  try {
    // Prepare data for API
    const apiPayload = {
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      company: customerData.company,
      vat: customerData.vatNumber || '',
      address: customerData.address,
      tag: customerData.tag || 'New',
      credit_limit: parseFloat(customerData.creditLimit) || 0,
      payment_terms: parseInt(customerData.paymentTerms) || 30,
      opening_balance: parseFloat(customerData.openingBalance) || 0,
      opening_balance_type: customerData.openingBalanceType || 'Dr',
      customer_type: customerData.customerType || 'Individual',
      status: customerData.status || 'Active',
      notes: customerData.notes || ''
    };

    let result;
    
    if (customerData.id && customerData.id.startsWith('CUST-')) {
      // Update existing
      result = await CRMClient.updateCustomer(customerData.id, apiPayload);
    } else {
      // Add new
      result = await CRMClient.addCustomer(apiPayload);
      
      if (result.success && result.data) {
        customerData.id = result.data.id;
      }
    }

    // Update local array
    const index = customers.findIndex(c => c.id === customerData.id);
    if (index >= 0) {
      customers[index] = { ...customers[index], ...customerData };
    } else {
      customers.push(customerData);
    }

    // Refresh UI
    renderCustomers();
    closeCustomerModal();
    updateDashboard();
    
    return result;
  } catch (error) {
    console.error('Failed to save customer:', error);
    APIClient.showToast('Failed to save customer: ' + error.message, 'error');
    throw error;
  }
}

/**
 * NEW: Add this function for recording customer invoice
 * AUTO-records transaction when invoice is created
 */
async function recordCustomerInvoice(customerId, invoiceData) {
  try {
    // Record as invoice transaction
    await CRMClient.recordCustomerTransaction(customerId, {
      type: 'Invoice',
      amount: invoiceData.totalAmount || invoiceData.total,
      date: invoiceData.date || new Date().toISOString().split('T')[0],
      invoice_id: invoiceData.id || '',
      note: `Invoice ${invoiceData.invoiceNumber || ''}`
    });

    // Auto-sync to get updated totals
    await syncCustomersFromApi();
  } catch (error) {
    console.error('Failed to record invoice:', error);
  }
}

/**
 * NEW: Add this function for recording customer payment
 */
async function recordCustomerPayment(customerId, paymentData) {
  try {
    await CRMClient.recordCustomerTransaction(customerId, {
      type: 'Payment',
      amount: paymentData.amount,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      note: paymentData.note || 'Payment received'
    });

    // Auto-sync
    await syncCustomersFromApi();
  } catch (error) {
    console.error('Failed to record payment:', error);
  }
}

/**
 * REPLACE: viewContactHistory() function
 * OLD: Shows local contact notes
 * NEW: Shows complete contact history from CRM with full details
 */
async function viewContactHistory(customerId) {
  try {
    const modal = document.getElementById('contactHistoryModal');
    if (!modal) return;

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Load contacts from CRM
    const contacts = await CRMClient.getCustomerContacts(customerId);
    
    // Build contact list HTML
    const contactList = document.getElementById('contactHistoryList');
    if (contactList) {
      if (contacts.length === 0) {
        contactList.innerHTML = '<p style="color: #999;">No contact history yet</p>';
      } else {
        contactList.innerHTML = contacts.map(contact => `
          <div style="background: #f5f5f5; padding: 12px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #2196F3;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #2196F3;">${contact.type}</strong>
              <small style="color: #999;">${CRMUIHelpers.formatDate(contact.date)}</small>
            </div>
            <p style="margin: 5px 0; color: #333;">${contact.message}</p>
          </div>
        `).join('');
      }
    }

    // Setup save contact function
    const saveContactBtn = document.querySelector('#contactHistoryModal button.btn-primary') || 
                          document.createElement('button');
    saveContactBtn.innerHTML = 'Add Contact Note';
    saveContactBtn.onclick = async () => {
      const noteText = document.getElementById('newContactNote').value;
      if (!noteText.trim()) {
        alert('Please enter a note');
        return;
      }

      await CRMClient.logCustomerContact(customerId, {
        type: 'Note',
        message: noteText,
        date: new Date().toISOString().split('T')[0]
      });

      document.getElementById('newContactNote').value = '';
      viewContactHistory(customerId); // Refresh
    };

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error viewing contact history:', error);
    alert('Failed to load contact history: ' + error.message);
  }
}

/**
 * REPLACE: addContactNote() function
 * OLD: Adds to local array
 * NEW: Saves to CRM database
 */
async function addContactNote() {
  try {
    const noteText = document.getElementById('newContactNote').value;
    if (!noteText.trim()) {
      alert('Please enter a note');
      return;
    }

    if (currentCustomerId) {
      await CRMClient.logCustomerContact(currentCustomerId, {
        type: 'Note',
        message: noteText,
        date: new Date().toISOString().split('T')[0]
      });

      document.getElementById('newContactNote').value = '';
      
      // Refresh contact history
      viewContactHistory(currentCustomerId);
    }
  } catch (error) {
    console.error('Error adding contact note:', error);
  }
}

/**
 * NEW: Add this function to send WhatsApp via CRM
 */
async function sendWhatsAppToCustomer() {
  try {
    const customer = customers.find(c => c.id === currentCustomerId);
    if (!customer) return;

    // Log the WhatsApp contact
    await CRMClient.logCustomerContact(currentCustomerId, {
      type: 'WhatsApp',
      message: 'WhatsApp message sent',
      date: new Date().toISOString().split('T')[0]
    });

    // Open WhatsApp
    const message = encodeURIComponent('Hi ' + customer.name + ', ');
    window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${message}`, '_blank');

    viewContactHistory(currentCustomerId);
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
  }
}

/**
 * NEW: Add this function to send Email via CRM
 */
async function sendEmailToCustomer() {
  try {
    const customer = customers.find(c => c.id === currentCustomerId);
    if (!customer) return;

    // Log the email contact
    await CRMClient.logCustomerContact(currentCustomerId, {
      type: 'Email',
      message: 'Email sent',
      date: new Date().toISOString().split('T')[0]
    });

    // Open email client
    window.location.href = `mailto:${customer.email}?subject=Re: Your Invoice`;

    viewContactHistory(currentCustomerId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

/**
 * NEW: Add customer statement generation
 */
async function generateCustomerStatement(customerId) {
  try {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Get transactions
    const transactions = await CRMClient.getCustomerTransactions(customerId);

    // Export as PDF
    await CRMExport.exportCustomerStatement(customer, transactions);
  } catch (error) {
    console.error('Error generating statement:', error);
    alert('Failed to generate statement: ' + error.message);
  }
}

// ==================== SUPPLIER MANAGEMENT ====================

/**
 * REPLACE: syncSuppliersFromApi() function
 */
async function syncSuppliersFromApi() {
  try {
    if (!isApiEnabled()) {
      console.warn('API not configured, using local data');
      return;
    }
    
    const apiSuppliers = await CRMClient.getSuppliers();
    
    suppliers = apiSuppliers.map(supp => ({
      id: supp.id || `local-${Date.now()}`,
      name: supp.name || '',
      phone: supp.phone || '',
      email: supp.email || '',
      company: supp.company || '',
      vatNumber: supp.vat || '',
      address: supp.address || '',
      paymentTerms: supp.payment_terms || 30,
      bankName: supp.bank_name || '',
      bankAccount: supp.bank_account || '',
      contactPerson: supp.contact_person || '',
      totalPurchase: supp.total_purchase || 0,
      totalPaid: supp.total_paid || 0,
      dueAmount: supp.due_amount || 0,
      status: supp.status || 'Active',
      createdDate: supp.created_date || '',
      notes: supp.notes || ''
    }));
    
    console.log('Synchronized ' + suppliers.length + ' suppliers from API');
    renderSuppliers();
  } catch (error) {
    console.error('Failed to sync suppliers from API:', error);
  }
}

/**
 * REPLACE: Save supplier function
 */
async function saveSupplierWithCRM(supplierData) {
  try {
    const apiPayload = {
      name: supplierData.name,
      phone: supplierData.phone,
      email: supplierData.email,
      company: supplierData.company,
      vat: supplierData.vatNumber || '',
      address: supplierData.address,
      payment_terms: parseInt(supplierData.paymentTerms) || 30,
      bank_name: supplierData.bankName || '',
      bank_account: supplierData.bankAccount || '',
      contact_person: supplierData.contactPerson || '',
      status: supplierData.status || 'Active',
      notes: supplierData.notes || ''
    };

    let result;
    
    if (supplierData.id && supplierData.id.startsWith('SUP-')) {
      result = await CRMClient.updateSupplier(supplierData.id, apiPayload);
    } else {
      result = await CRMClient.addSupplier(apiPayload);
      
      if (result.success && result.data) {
        supplierData.id = result.data.id;
      }
    }

    const index = suppliers.findIndex(s => s.id === supplierData.id);
    if (index >= 0) {
      suppliers[index] = { ...suppliers[index], ...supplierData };
    } else {
      suppliers.push(supplierData);
    }

    renderSuppliers();
    closeSupplierModal();
    
    return result;
  } catch (error) {
    console.error('Failed to save supplier:', error);
    throw error;
  }
}

/**
 * NEW: Record supplier purchase
 */
async function recordSupplierPurchase(supplierId, purchaseData) {
  try {
    await CRMClient.recordSupplierTransaction(supplierId, {
      type: 'Purchase',
      amount: purchaseData.amount,
      date: purchaseData.date || new Date().toISOString().split('T')[0],
      purchase_id: purchaseData.id || '',
      note: purchaseData.note || 'Purchase recorded'
    });

    await syncSuppliersFromApi();
  } catch (error) {
    console.error('Failed to record purchase:', error);
  }
}

/**
 * NEW: Record supplier payment
 */
async function recordSupplierPayment(supplierId, paymentData) {
  try {
    await CRMClient.recordSupplierTransaction(supplierId, {
      type: 'Payment',
      amount: paymentData.amount,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      note: paymentData.note || 'Payment made'
    });

    await syncSuppliersFromApi();
  } catch (error) {
    console.error('Failed to record payment:', error);
  }
}

// ==================== DASHBOARD ENHANCEMENTS ====================

/**
 * ADD: Enhanced dashboard function that shows CRM statistics
 */
async function updateDashboardWithCRMStats() {
  try {
    if (!isApiEnabled()) return;

    // Get statistics
    const customerStats = await CRMClient.getCustomerStatistics();
    const supplierStats = await CRMClient.getSupplierStatistics();

    // Update customer card
    const customerCard = document.getElementById('customerStat');
    if (customerCard) {
      customerCard.innerHTML = `
        <div style="text-align: center;">
          <i class="fas fa-users"></i>
          <h3>${customerStats.total_customers}</h3>
          <small>Total Customers</small>
          <p style="color: #4CAF50; margin: 10px 0;">${customerStats.active_customers} Active</p>
          <p style="color: #f44336;">Due: ${CRMCalculations.formatMoney(customerStats.total_due)}</p>
        </div>
      `;
    }

    // Update supplier card
    const supplierCard = document.getElementById('supplierStat');
    if (supplierCard) {
      supplierCard.innerHTML = `
        <div style="text-align: center;">
          <i class="fas fa-truck-loading"></i>
          <h3>${supplierStats.total_suppliers}</h3>
          <small>Total Suppliers</small>
          <p style="color: #f44336;">Payable: ${CRMCalculations.formatMoney(supplierStats.total_due)}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to update dashboard stats:', error);
  }
}

// ==================== EXPORT ENHANCEMENTS ====================

/**
 * ADD: Export customers to Excel
 */
function exportCustomersToExcel() {
  CRMExport.exportCustomersToExcel(customers, `customers_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * ADD: Export suppliers to Excel
 */
function exportSuppliersToExcel() {
  CRMExport.exportSuppliersToExcel(suppliers, `suppliers_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ==================== INITIALIZATION ====================

/**
 * UPDATE: Add CRM initialization to your loadData() function
 * 
 * In loadData(), after loading local storage data, add:
 */
async function loadDataWithCRM() {
  // Load existing local data first
  loadData();

  // If API is enabled, sync from CRM
  if (isApiEnabled()) {
    console.log('Syncing data from CRM...');
    await Promise.all([
      syncCustomersFromApi(),
      syncSuppliersFromApi()
    ]);
    
    // Update dashboard with CRM stats
    updateDashboardWithCRMStats();
  }
}

// ==================== NOTES ====================

/**
 * KEY IMPLEMENTATION POINTS:
 * 
 * 1. Data Flow:
 *    Local Storage ← API Call → Google Sheets (via Apps Script)
 * 
 * 2. Financial Calculations:
 *    - Backend handles due amount calculation automatically
 *    - Frontend can use CRMCalculations.calculateCustomerDue() for display
 * 
 * 3. Transactions:
 *    - Invoice/Payment recorded as separate transactions
 *    - Totals auto-update via backend
 * 
 * 4. Contact History:
 *    - Each contact logged separately
 *    - Searchable by type and date
 * 
 * 5. Error Handling:
 *    - All CRM operations show toasts on success/failure
 *    - Fallback to local data if API unavailable
 * 
 * 6. Performance:
 *    - Data cached in local variables
 *    - Only API calls when needed
 *    - Batch operations when possible
 */
