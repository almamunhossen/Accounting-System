const TEMPLATE_SPREADSHEET_ID = '1okpAP9AlmmKai3jn5SfjzGuuLcW1eS4vAbMZSjyD5u0';

function getTemplateSpreadsheet() {
  return SpreadsheetApp.openById(TEMPLATE_SPREADSHEET_ID);
}

/**
 * Supplier Management System Template for Google Sheets
 * Run: setupSupplierManagementSystemTemplate()
 */

const SMS_TEMPLATE = {
  sheets: {
    suppliers: {
      name: 'Suppliers',
      headers: [
        'Supplier ID',
        'Supplier Name',
        'Company Name',
        'Contact Person',
        'Phone',
        'Email',
        'Address',
        'VAT Number',
        'Opening Balance',
        'Status'
      ]
    },
    purchases: {
      name: 'Purchases',
      headers: [
        'Purchase ID',
        'Date',
        'Supplier ID',
        'Product Name',
        'Quantity',
        'Unit Price',
        'Total Amount',
        'Payment Status',
        'Invoice No',
        'Notes'
      ]
    },
    payments: {
      name: 'Payments',
      headers: [
        'Payment ID',
        'Date',
        'Supplier ID',
        'Purchase ID',
        'Amount Paid',
        'Payment Method',
        'Reference No',
        'Notes'
      ]
    },
    products: {
      name: 'Products',
      headers: [
        'Product ID',
        'Product Name',
        'Supplier ID',
        'Cost Price',
        'Selling Price',
        'Stock'
      ]
    },
    ledger: {
      name: 'Supplier Ledger',
      headers: [
        'Supplier ID',
        'Supplier Name',
        'Total Purchase',
        'Total Paid',
        'Balance'
      ]
    },
    dashboard: {
      name: 'Dashboard',
      headers: ['Metric', 'Value']
    }
  }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supplier System')
    .addItem('Setup Template', 'setupSupplierManagementSystemTemplate')
    .addItem('Reapply Formatting/Rules', 'refreshSupplierManagementTemplateFormatting')
    .addItem('Remove All Demo Data', 'removeAllSupplierDemoData')
    .addToUi();
}

function removeAllSupplierDemoData() {
  const ss = getTemplateSpreadsheet();
  const sheetNames = [
    SMS_TEMPLATE.sheets.suppliers.name,
    SMS_TEMPLATE.sheets.purchases.name,
    SMS_TEMPLATE.sheets.payments.name,
    SMS_TEMPLATE.sheets.products.name,
    SMS_TEMPLATE.sheets.ledger.name,
    SMS_TEMPLATE.sheets.dashboard.name
  ];

  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;

    const lastRow = Math.max(1, Number(sheet.getLastRow()) || 1);
    const lastCol = Math.max(1, Number(sheet.getLastColumn()) || 1);
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    }
  });

  refreshSupplierManagementTemplateFormatting();
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('All demo data has been removed from Supplier System sheets.');
}

function setupSupplierManagementSystemTemplate() {
  const ss = getTemplateSpreadsheet();

  const suppliers = ensureSheetWithHeaders_(ss, SMS_TEMPLATE.sheets.suppliers.name, SMS_TEMPLATE.sheets.suppliers.headers);
  const purchases = ensureSheetWithHeaders_(ss, SMS_TEMPLATE.sheets.purchases.name, SMS_TEMPLATE.sheets.purchases.headers);
  const payments = ensureSheetWithHeaders_(ss, SMS_TEMPLATE.sheets.payments.name, SMS_TEMPLATE.sheets.payments.headers);
  const products = ensureSheetWithHeaders_(ss, SMS_TEMPLATE.sheets.products.name, SMS_TEMPLATE.sheets.products.headers);
  const ledger = ensureSheetWithHeaders_(ss, SMS_TEMPLATE.sheets.ledger.name, SMS_TEMPLATE.sheets.ledger.headers);
  const dashboard = ensureSheetWithHeaders_(ss, SMS_TEMPLATE.sheets.dashboard.name, SMS_TEMPLATE.sheets.dashboard.headers);

  applySupplierSheetRules_(suppliers);
  applyPurchasesSheetRules_(purchases, suppliers);
  applyPaymentsSheetRules_(payments, suppliers, purchases);
  applyProductsSheetRules_(products, suppliers);
  applyLedgerSheetRules_(ledger);
  applyDashboardSheet_(dashboard);

  applyCommonSheetFormatting_([suppliers, purchases, payments, products, ledger, dashboard]);
  createDashboardCharts_(dashboard, purchases, payments);

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('Supplier Management template is ready.');
}

function refreshSupplierManagementTemplateFormatting() {
  const ss = getTemplateSpreadsheet();
  const suppliers = ss.getSheetByName(SMS_TEMPLATE.sheets.suppliers.name);
  const purchases = ss.getSheetByName(SMS_TEMPLATE.sheets.purchases.name);
  const payments = ss.getSheetByName(SMS_TEMPLATE.sheets.payments.name);
  const products = ss.getSheetByName(SMS_TEMPLATE.sheets.products.name);
  const ledger = ss.getSheetByName(SMS_TEMPLATE.sheets.ledger.name);
  const dashboard = ss.getSheetByName(SMS_TEMPLATE.sheets.dashboard.name);

  if (!suppliers || !purchases || !payments || !products || !ledger || !dashboard) {
    SpreadsheetApp.getUi().alert('Run Setup Template first.');
    return;
  }

  applySupplierSheetRules_(suppliers);
  applyPurchasesSheetRules_(purchases, suppliers);
  applyPaymentsSheetRules_(payments, suppliers, purchases);
  applyProductsSheetRules_(products, suppliers);
  applyLedgerSheetRules_(ledger);
  applyDashboardSheet_(dashboard);
  applyCommonSheetFormatting_([suppliers, purchases, payments, products, ledger, dashboard]);
  createDashboardCharts_(dashboard, purchases, payments);

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('Formatting, validation, and formulas refreshed.');
}

function ensureSheetWithHeaders_(ss, sheetName, headers) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  const safeHeaders = Array.isArray(headers) && headers.length ? headers : ['Column 1'];
  sh.clear();
  sh.getRange(1, 1, 1, safeHeaders.length).setValues([safeHeaders]);
  return sh;
}

function applySupplierSheetRules_(sheet) {
  // Auto Supplier ID
  sheet.getRange('A2').setFormula('=ARRAYFORMULA(IF(B2:B="",, "SUP-" & TEXT(ROW(B2:B)-1,"000")))');

  // Status dropdown
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Active', 'Inactive'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('J2:J').setDataValidation(statusRule);

  // Prevent duplicate supplier IDs
  const uniqueIdRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=COUNTIF($A:$A,A2)=1')
    .setAllowInvalid(false)
    .setHelpText('Duplicate Supplier ID is not allowed.')
    .build();
  sheet.getRange('A2:A').setDataValidation(uniqueIdRule);

  protectColumn_(sheet, 1, 'Protect Supplier ID formula column');

  sheet.setFrozenRows(1);
  setFilter_(sheet);

  setColumnWidths_(sheet, [
    120, 180, 180, 160, 140, 200, 240, 150, 130, 120
  ]);
}

function applyPurchasesSheetRules_(sheet, suppliersSheet) {
  sheet.getRange('A2').setFormula('=ARRAYFORMULA(IF(C2:C="",, "PUR-" & TEXT(ROW(C2:C)-1,"000")))');
  sheet.getRange('G2').setFormula('=ARRAYFORMULA(IF((E2:E="")+(F2:F=""),,E2:E*F2:F))');

  const supplierRange = suppliersSheet.getRange('A2:A');
  const supplierRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(supplierRange, true)
    .setAllowInvalid(false)
    .setHelpText('Choose a Supplier ID from Suppliers sheet.')
    .build();
  sheet.getRange('C2:C').setDataValidation(supplierRule);

  const paymentStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Paid', 'Due'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('H2:H').setDataValidation(paymentStatusRule);

  // Highlight Due payments in red
  const dueRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$H2="Due"')
    .setBackground('#fde2e1')
    .setRanges([sheet.getRange('A2:J')])
    .build();
  sheet.setConditionalFormatRules([dueRule]);

  protectColumn_(sheet, 1, 'Protect Purchase ID formula column');
  protectColumn_(sheet, 7, 'Protect Total Amount formula column');

  sheet.setFrozenRows(1);
  setFilter_(sheet);

  setColumnWidths_(sheet, [
    120, 120, 130, 220, 110, 120, 130, 130, 160, 260
  ]);
}

function applyPaymentsSheetRules_(sheet, suppliersSheet, purchasesSheet) {
  sheet.getRange('A2').setFormula('=ARRAYFORMULA(IF(C2:C="",, "PAY-" & TEXT(ROW(C2:C)-1,"000")))');

  const supplierRange = suppliersSheet.getRange('A2:A');
  const supplierRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(supplierRange, true)
    .setAllowInvalid(false)
    .setHelpText('Choose a Supplier ID from Suppliers sheet.')
    .build();
  sheet.getRange('C2:C').setDataValidation(supplierRule);

  // Optional Purchase ID
  const purchaseRange = purchasesSheet.getRange('A2:A');
  const purchaseRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(purchaseRange, true)
    .setAllowInvalid(true)
    .setHelpText('Optional: choose a Purchase ID from Purchases sheet.')
    .build();
  sheet.getRange('D2:D').setDataValidation(purchaseRule);

  const methodRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Cash', 'Bank'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('F2:F').setDataValidation(methodRule);

  protectColumn_(sheet, 1, 'Protect Payment ID formula column');

  sheet.setFrozenRows(1);
  setFilter_(sheet);

  setColumnWidths_(sheet, [
    120, 120, 130, 130, 130, 130, 170, 260
  ]);
}

function applyProductsSheetRules_(sheet, suppliersSheet) {
  sheet.getRange('A2').setFormula('=ARRAYFORMULA(IF(B2:B="",, "PRD-" & TEXT(ROW(B2:B)-1,"000")))');

  const supplierRange = suppliersSheet.getRange('A2:A');
  const supplierRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(supplierRange, true)
    .setAllowInvalid(false)
    .setHelpText('Choose a Supplier ID from Suppliers sheet.')
    .build();
  sheet.getRange('C2:C').setDataValidation(supplierRule);

  protectColumn_(sheet, 1, 'Protect Product ID formula column');

  sheet.setFrozenRows(1);
  setFilter_(sheet);

  setColumnWidths_(sheet, [
    120, 220, 130, 120, 120, 110
  ]);
}

function applyLedgerSheetRules_(sheet) {
  sheet.getRange('A2').setFormula('=ARRAYFORMULA(FILTER(Suppliers!A2:B, Suppliers!A2:A<>""))');
  sheet.getRange('C2').setFormula('=ARRAYFORMULA(IF(A2:A="",,SUMIF(Purchases!C:C, A2:A, Purchases!G:G)))');
  sheet.getRange('D2').setFormula('=ARRAYFORMULA(IF(A2:A="",,SUMIF(Payments!C:C, A2:A, Payments!E:E)))');
  sheet.getRange('E2').setFormula('=ARRAYFORMULA(IF(A2:A="",,C2:C-D2:D))');

  protectColumn_(sheet, 1, 'Protect Ledger Supplier ID formula column');
  protectColumn_(sheet, 2, 'Protect Ledger Supplier Name formula column');
  protectColumn_(sheet, 3, 'Protect Ledger Total Purchase formula column');
  protectColumn_(sheet, 4, 'Protect Ledger Total Paid formula column');
  protectColumn_(sheet, 5, 'Protect Ledger Balance formula column');

  const balanceDueRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground('#fde2e1')
    .setRanges([sheet.getRange('E2:E')])
    .build();
  sheet.setConditionalFormatRules([balanceDueRule]);

  sheet.setFrozenRows(1);
  setFilter_(sheet);

  setColumnWidths_(sheet, [
    120, 220, 150, 140, 140
  ]);
}

function applyDashboardSheet_(sheet) {
  const labels = [
    ['Total Suppliers'],
    ['Total Purchase'],
    ['Total Paid'],
    ['Total Due']
  ];

  sheet.getRange(2, 1, labels.length, 1).setValues(labels);
  sheet.getRange('B2').setFormula('=COUNTA(Suppliers!A2:A)');
  sheet.getRange('B3').setFormula('=SUM(Purchases!G2:G)');
  sheet.getRange('B4').setFormula('=SUM(Payments!E2:E)');
  sheet.getRange('B5').setFormula('=B3-B4');

  protectColumn_(sheet, 2, 'Protect Dashboard formula column');

  sheet.setFrozenRows(1);
  setFilter_(sheet);
  setColumnWidths_(sheet, [220, 180]);
}

function createDashboardCharts_(dashboardSheet, purchasesSheet, paymentsSheet) {
  const existing = dashboardSheet.getCharts();
  existing.forEach(chart => dashboardSheet.removeChart(chart));

  const purchasesRange = purchasesSheet.getRange('B1:G');
  const paymentsRange = paymentsSheet.getRange('B1:E');

  const purchasesChart = dashboardSheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(purchasesRange)
    .setPosition(8, 1, 0, 0)
    .setOption('title', 'Purchases Overview')
    .setOption('legend', { position: 'none' })
    .build();

  const paymentsChart = dashboardSheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(paymentsRange)
    .setPosition(8, 8, 0, 0)
    .setOption('title', 'Payments Overview')
    .setOption('legend', { position: 'none' })
    .build();

  dashboardSheet.insertChart(purchasesChart);
  dashboardSheet.insertChart(paymentsChart);
}

function applyCommonSheetFormatting_(sheets) {
  sheets.forEach(sheet => {
    const lastCol = Math.max(1, Number(sheet.getLastColumn()) || 0);
    const header = sheet.getRange(1, 1, 1, lastCol);
    header
      .setBackground('#0f766e')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    sheet.getDataRange().setWrap(true);
    sheet.getDataRange().setVerticalAlignment('middle');
    sheet.setRowHeights(1, Math.max(1, sheet.getMaxRows()), 28);

    const body = sheet.getRange(2, 1, Math.max(1, sheet.getMaxRows() - 1), lastCol);
    body.setFontSize(10);
  });
}

function setFilter_(sheet) {
  const lastCol = Math.max(1, Number(sheet.getLastColumn()) || 0);
  if (sheet.getMaxColumns() < lastCol) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), lastCol - sheet.getMaxColumns());
  }
  const range = sheet.getDataRange();
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  if (range.getNumRows() >= 1 && range.getNumColumns() >= 1) {
    range.createFilter();
  }
}

function setColumnWidths_(sheet, widths) {
  widths.forEach((width, idx) => sheet.setColumnWidth(idx + 1, width));
}

function protectColumn_(sheet, columnIndex, description) {
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  protections
    .filter(p => p.getDescription() === description)
    .forEach(p => p.remove());

  const maxRows = sheet.getMaxRows();
  const range = sheet.getRange(2, columnIndex, Math.max(1, maxRows - 1), 1);
  const protection = range.protect().setDescription(description);

  try {
    const me = Session.getEffectiveUser();
    protection.removeEditors(protection.getEditors());
    protection.addEditor(me);
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (error) {
    // Fallback when editor permissions are restricted.
    protection.setWarningOnly(true);
  }
}


