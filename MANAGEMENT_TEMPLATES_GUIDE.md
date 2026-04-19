# Management Templates Setup Guide

This system includes 6 complete management templates for Google Sheets. Each template provides a full suite of sheets, formulas, validation, formatting, and dashboards for a specific business module.

## Available Templates

### 1. **Admin Management Template** (`AdminManagementTemplate.gs`)
**Run:** `setupAdminManagementSystemTemplate()`

**Sheets:**
- **Users** - User accounts with roles, departments, and status tracking
- **Audit Logs** - Complete system activity log with timestamps and status
- **System Settings** - Configuration management for system parameters
- **Permissions & Roles** - Role-based access control (RBAC) matrix
- **Admin Dashboard** - Key metrics including active users, failed logins, audit activity

**Features:**
- Auto-generated user IDs (USR-0001, USR-0002, etc.)
- Auto-generated audit log IDs (AUD-00001, AUD-00002, etc.)
- Role-based validation for user assignment
- Action type validation (Create, Read, Update, Delete, Export, Login, Logout, etc.)
- Status tracking (Active, Inactive, Suspended, Pending)
- Conditional formatting for active users (green), suspended (red), unauthorized attempts (yellow)
- Protected ID columns
- Audit trail with timestamp, user, action, module, record type, and status
- Permission matrix showing module access and CRUD permissions per role
- System settings configuration with type validation (String, Number, Boolean, Date, Email, URL)
- Dashboard KPIs: Total Users, Active Users, Roles, Audit Logs Today, Failed Logins
- Charts for audit actions distribution and user status breakdown

---

### 2. **Supplier Management Template** (`SupplierManagementTemplate.gs`)
**Run:** `setupSupplierManagementSystemTemplate()`

**Sheets:**
- **Suppliers** - Supplier master data with auto-generated IDs, status tracking, and bank details
- **Purchases** - Purchase orders with auto-calculated totals and payment status
- **Payments** - Payment tracking linked to purchases
- **Products** - Products by supplier with cost and selling prices
- **Supplier Ledger** - Automated ledger showing total purchase, paid, and balance due
- **Dashboard** - Key metrics with charts (Total Suppliers, Total Purchase, Total Paid, Total Due)

**Features:**
- Auto-generated supplier IDs (SUP-001, SUP-002, etc.)
- Data validation dropdowns for status and suppliers
- Conditional formatting for overdue items (red background)
- Protected formula columns
- Automated ledger calculations
- Charts for purchase and payment trends

---

### 2. **Customer Management Template** (`CustomerManagementTemplate.gs`)
**Run:** `setupCustomerManagementSystemTemplate()`

**Sheets:**
- **Customers** - Customer master data with credit limits, payment terms, and status
- **Invoices** - Invoices linked to customers with automatic calculations
- **Customer Payments** - Payment tracking per customer
- **Customer Contacts** - Contact log with follow-up scheduling
- **Customer Ledger** - Auto-calculated total invoiced, paid, and balance due
- **Customer Dashboard** - KPIs: Total Customers, Active Customers, Total Due, Days Overdue

**Features:**
- Auto-generated customer IDs (CUST-001, CUST-002, etc.)
- Customer type validation (Individual/Company)
- Invoice status tracking (Paid/Partial/Due)
- Contact type selection (Call/Email/SMS/WhatsApp/Visit/Note)
- Conditional formatting for overdue invoices
- Customer aging analysis with days overdue calculation
- Automated financial summary per customer

---

### 3. **Invoice Management Template** (`InvoiceManagementTemplate.gs`)
**Run:** `setupInvoiceManagementSystemTemplate()`

**Sheets:**
- **Invoices** - Invoice header with auto-calculated VAT, discounts, and totals
- **Invoice Items** - Line items with quantities and unit prices
- **Invoice Payments** - Payment records linked to invoices
- **Invoice Aging** - Aging analysis showing days overdue per invoice
- **Invoice Dashboard** - Metrics: Total Invoices, Total Amount, Total Paid, Outstanding, Overdue

**Features:**
- Auto-generated invoice IDs and sequence numbers
- Auto-calculation of line totals (Qty × Unit Price)
- Discount and VAT percentage fields
- Payment method validation (Cash/Bank/Cheque/Card)
- Conditional formatting for overdue invoices (red)
- Automated aging report
- Charts for invoice and payment trends

---

### 4. **Product Management Template** (`ProductManagementTemplate.gs`)
**Run:** `setupProductManagementSystemTemplate()`

**Sheets:**
- **Products & Services** - Product master with cost, selling price, and margin %
- **Stock Movements** - Inbound and outbound stock adjustments
- **Inventory Report** - Real-time inventory status with reorder alerts
- **Categories** - Product categories for organization
- **Product Dashboard** - KPIs: Total Products, Low Stock Items, Inventory Value, Margins

**Features:**
- Auto-generated product IDs (PROD-001, PROD-002, etc.)
- Automatic margin % calculation ((Selling - Cost) / Selling × 100)
- Stock movement types (In Stock/Out/Return/Adjustment/Damage)
- Category validation from Categories sheet
- Conditional formatting for low stock items (yellow)
- Inventory valuation (Qty × Unit Price)
- Status tracking (Active/Discontinued/Obsolete)
- Charts for inventory status and reorder alerts

---

### 5. **Employee Management Template** (`EmployeeManagementTemplate.gs`)
**Run:** `setupEmployeeManagementSystemTemplate()`

**Sheets:**
- **Employees** - Employee master with salary, department, position, and hire date
- **Attendance** - Daily attendance with hours worked
- **Leaves** - Leave requests with auto-calculated number of days
- **Payroll** - Monthly payroll with auto-calculated net pay (Base + Allowances - Deductions)
- **HR Dashboard** - KPIs: Total Employees, Active, On Leave, Absent Today, Total Payroll

**Features:**
- Auto-generated employee IDs (EMP-001, EMP-002, etc.)
- Leave types (Annual/Sick/Maternity/Compassionate)
- Attendance status options (Present/Absent/Half Day/Late/Holiday)
- Leave approval workflow (Approved/Pending/Rejected)
- Payroll status tracking (Pending/Approved/Paid)
- Conditional formatting for absences (red) and approvals (green)
- Auto-calculation of leave days from date range
- Charts for attendance patterns and payroll trends

---

### 6. **Expense Management Template** (`ExpenseManagementTemplate.gs`)
**Run:** `setupExpenseManagementSystemTemplate()`

**Sheets:**
- **Expenses** - Expense entries with category, amount, and approval status
- **Expense Categories** - Category master with budget limits
- **Budget Tracking** - Category-wise budget vs. actual comparison
- **Department Expenses** - Quarterly expense breakdown by department
- **Expense Dashboard** - KPIs: Total Expenses, This Month/Quarter/Year, Budget Used %, Over Budget Categories

**Features:**
- Auto-generated expense IDs (EXP-0001, EXP-0002, etc.)
- Category validation with budget limits
- Payment method options (Cash/Credit Card/Bank/Cheque)
- Approval workflow (Draft/Submitted/Approved/Paid/Rejected)
- Budget tracking with auto-calculated remaining budget
- Over-budget alerts (red background)
- Quarterly expense breakdown per department
- Percentage-based budget utilization tracking
- Charts for budget vs. spent and department quarterly expenses

---

### 7. **Quotation Management Template** (`QuotationManagementTemplate.gs`)
**Run:** `setupQuotationManagementSystemTemplate()`

**Sheets:**
- **Quotations** - Quotation header with auto-calculated totals, discounts, VAT, and validity dates
- **Quotation Items** - Line items with auto-calculated line totals
- **Quotation Follow-up** - Follow-up tracking with follow-up types and next action dates
- **Quotation to Invoice** - Conversion tracking showing which quotations were converted to invoices
- **Quotation Dashboard** - KPIs: Total Quotations, Sent, Conversion Rate %, Total Value, Pending Follow-ups

**Features:**
- Auto-generated quotation IDs (QT-0001, QT-0002, etc.)
- Auto-calculation of subtotal, discounts, VAT, and total
- Validity date tracking with expiration alerts
- Quotation status workflow (Draft/Sent/Accepted/Rejected/Expired/Converted)
- Automatic line item totals (Qty × Unit Price)
- Follow-up management with follow-up types (Email/Call/Meeting/SMS/WhatsApp/In-person)
- Conditional formatting for accepted (green), expired (red), rejected (yellow)
- Conversion tracking linking quotations to invoices
- Conversion rate calculation for sales pipeline analysis
- Charts for quotation status distribution

---

### 8. **Settings Management Template** (`SettingsManagementTemplate.gs`)
**Run:** `setupSettingsManagementSystemTemplate()`

**Sheets:**
- **System Settings** - Global configuration with type validation (String, Number, Boolean, Date, Email, URL, Currency)
- **Company Settings** - Company information, branding, contact details, registration numbers
- **User Preferences** - Individual user settings (theme, language, date format, timezone, currency)
- **Notification Settings** - Notification rule configuration with multi-channel options (Email, SMS, In-App)
- **Settings Audit Log** - Change tracking showing who modified what, when, and what changed
- **Settings Dashboard** - KPIs: Active Settings, User Count, Notification Types, Last Update, System Health

**Features:**
- Auto-generated setting IDs (SET-001, SET-002, etc.)
- Type-safe setting values (String, Number, Boolean, Date, Email, URL, Currency)
- Company profile management with currency and registration tracking
- User preference management per user (theme, language, timezone)
- Notification channel configuration with enable/disable per type
- Comprehensive audit trail for compliance and troubleshooting
- Conditional formatting for active settings (green)
- Status tracking (Active/Inactive/Archived)
- Role-based user preferences (Admin/Manager/User/Viewer)
- Charts for setting types and notification distribution

---

### 9. **Tasks Management Template** (`TasksManagementTemplate.gs`)
**Run:** `setupTasksManagementSystemTemplate()`

**Sheets:**
- **Tasks** - Task master with priority, status, and completion tracking
- **Subtasks** - Hierarchical subtask management linked to parent tasks
- **Task Comments** - Comment threads for collaboration and notes
- **Task History** - Complete change log showing all modifications
- **Tasks Dashboard** - KPIs: Total Tasks, In Progress, Completed, Overdue, Completion Rate

**Features:**
- Auto-generated task IDs (TSK-0001, TSK-0002, etc.)
- Priority levels (Critical, High, Medium, Low) with visual highlighting
- Status tracking (Not Started, In Progress, On Hold, Completed, Cancelled)
- Automatic "Days Until Due" calculation with overdue alerts
- Completion percentage field for progress tracking
- Subtask hierarchy for breaking down larger projects
- Comment threads for team collaboration
- Complete audit history of all changes
- Conditional formatting for critical tasks (red), completed (green), overdue (red)
- Conversion rate calculation for sales pipeline analysis
- Charts for task status and priority distribution

---

## Common Features Across All Templates

### 1. **Auto-Generated IDs**
Each record type gets a unique, sequential ID using ARRAYFORMULA:
- `SUP-001`, `CUST-002`, `INV-003`, `EMP-004`, etc.

### 2. **Data Validation**
- Dropdown lists for status, types, and categories
- Linked validation (e.g., Supplier IDs from Suppliers sheet)
- Prevents invalid data entry

### 3. **Auto-Formulas**
- Line total calculations (Qty × Price)
- Net pay calculations (Base + Allowances - Deductions)
- Running totals (Total Invoiced, Total Paid, Due Amount)
- Percentage calculations (Margin %, Budget Used %)

### 4. **Conditional Formatting**
- Overdue items highlighted in red
- Low stock items in yellow
- Active/approved items in green
- Budget overages in red

### 5. **Protected Columns**
- Formula-based columns are protected to prevent accidental changes
- ID columns are read-only
- Calculated fields are locked

### 6. **Frozen Headers**
- First row (header) is frozen for easy scrolling
- Column filters enabled for sorting and searching

### 7. **Dashboards**
- Each template includes a dashboard sheet
- Key performance indicators (KPIs) with auto-formulas
- Charts visualizing trends and comparisons
- Real-time data updates as records are added

### 8. **Column Formatting**
- Professional color scheme (teal headers)
- Consistent font sizing and spacing
- Text wrapping for readability
- Optimized column widths

---

## Setup Instructions

### For Each Template:

1. **Open Google Sheets**
   - Navigate to your spreadsheet

2. **Open Google Apps Script Editor**
   - Tools → Script Editor
   - Paste the template code into a new file

3. **Run Setup**
   - In the Script Editor, select the setup function (e.g., `setupCustomerManagementSystemTemplate()`)
   - Click ▶️ Run

4. **Authorize Script**
   - Click "Review permissions"
   - Select your Google account
   - Click "Allow"

5. **Access Menu**
   - Return to the spreadsheet
   - Refresh the page
   - You'll see a new menu (e.g., "Customer System")

6. **Choose Setup Option**
   - Click the menu and select "Setup Template"
   - Script will create all sheets with headers, formulas, and formatting

7. **Start Using**
   - Sheets are ready for data entry
   - Use the menu anytime to:
     - **Reapply Formatting/Rules** - Refresh formulas and styling
     - **Remove All Demo Data** - Clear entries while keeping structure

---

## Menu Options (Available in Each Template)

### 📋 Setup Template
Creates all required sheets with:
- Complete header structure
- Data validation rules
- Formula-based calculations
- Conditional formatting
- Protected columns
- Dashboard with charts

### 🔄 Reapply Formatting/Rules
Refreshes all:
- Data validation rules
- Conditional formatting
- Formula-based calculations
- Column protections
- Formatting styles

### 🗑️ Remove All Demo Data
Clears all data rows while preserving:
- Sheet structure
- Headers
- Validation rules
- Formulas
- Formatting

---

## Customization Tips

### Change Budget Limits
Edit **Expense Categories** or **Budget Tracking** sheet:
- Modify Budget column values

### Add Custom Categories
Edit **Categories** sheets:
- Add new rows with Category ID and Name
- Validation automatically recognizes new entries

### Modify Column Widths
In any sheet:
- Drag column borders to resize
- Double-click to auto-fit

### Change Colors
Select header row (row 1):
- Format → Fill Color → Choose new color

### Add More Sheets
Use "Insert Sheet" and copy header structure from existing sheets

---

## Best Practices

1. **Always use the templates** - Formulas are optimized for accurate calculations
2. **Don't delete formula columns** - They protect data integrity
3. **Use data validation** - Prevents invalid entries
4. **Review dashboards regularly** - Monitor KPIs and trends
5. **Archive old data** - Keep working sheets lean for performance
6. **Backup your spreadsheet** - File → Version history

---

## Support & Troubleshooting

### "Unknown action" Error
- Ensure the template code is in the correct Apps Script file
- Try running "Reapply Formatting/Rules"

### Formulas show as `#REF!`
- Check that referenced sheet names are correct
- Ensure no sheets have been deleted
- Run "Reapply Formatting/Rules" to refresh

### Data Validation Not Working
- Check sheet name in the validation rule
- Run "Reapply Formatting/Rules"

### Charts Not Showing
- Ensure data exists in the referenced range
- Run "Reapply Formatting/Rules" to regenerate charts

---

**Version:** 2.0 (April 2026)  
**Templates:** 6 complete management systems  
**Spreadsheet:** Google Sheets compatible
