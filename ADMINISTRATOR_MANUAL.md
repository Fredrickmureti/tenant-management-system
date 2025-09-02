# Mwanzo Flats Management System - Administrator Manual

## Table of Contents
1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [Managing Tenants](#managing-tenants)
4. [Billing Management](#billing-management)
5. [Payment Recording](#payment-recording)
6. [Communications](#communications)
7. [Reports & Exports](#reports--exports)
8. [Admin Management](#admin-management)
9. [Audit Logs](#audit-logs)
10. [System Features](#system-features)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

### What is this system?
This is a comprehensive water billing management system designed for Mwanzo Flats property to:
- Track tenant information and water meter readings
- Generate monthly water bills automatically
- Record payments and track balances
- Send communications to tenants
- Generate reports and export data
- Manage multiple administrators

### Key Benefits
- **Automated Calculations**: The system automatically calculates water usage, bills, and balances
- **Balance Carry-Forward**: Outstanding balances automatically carry to the next month
- **Payment Tracking**: Real-time tracking of payments and outstanding amounts
- **Export Capabilities**: Export data to Excel for external reporting
- **Multi-Admin Support**: Multiple administrators can work simultaneously
- **Audit Trail**: Complete log of all system activities

---

## Getting Started

### Accessing the System
1. Open your web browser
2. Navigate to your system URL
3. Click "Admin Login"
4. Enter your email and password
5. Click "Sign In"

### First-Time Setup
If you're the first administrator:
1. Complete your profile information
2. Add other administrators (if needed)
3. Import or manually add tenant information
4. Set up billing parameters (rates, standing charges)

### Dashboard Overview
After logging in, you'll see the main dashboard with:
- **Total Tenants**: Number of active tenants
- **Outstanding Balance**: Total money owed by all tenants
- **This Month's Bills**: Number of bills generated this month
- **Recent Activity**: Latest system activities

---

## Managing Tenants

### Adding a New Tenant
1. Go to "Tenants" in the main menu
2. Click "Add Tenant" button
3. Fill in the required information:
   - **Name**: Tenant's full name
   - **Email**: For communications (optional)
   - **Phone**: Contact number
   - **House/Unit Number**: Physical address/unit identifier
   - **Meter Connection Number**: Unique meter identifier
4. Click "Save"

### Editing Tenant Information
1. Go to "Tenants" page
2. Find the tenant in the list
3. Click the "Edit" button (pencil icon)
4. Update the information
5. Click "Save Changes"

### Tenant Status Management
- **Active**: Tenant is currently using the service
- **Inactive**: Tenant has moved out or service suspended

### Importing Multiple Tenants
1. Prepare an Excel file with columns: Name, Email, Phone, House Unit Number, Meter Connection Number
2. Go to "Tenants" page
3. Click "Import Tenants"
4. Select your Excel file
5. Review the preview
6. Click "Import"

---

## Billing Management

### Understanding the Billing Process
The system follows a monthly billing cycle:
1. **Read Meters**: Record current meter readings
2. **Calculate Usage**: System automatically calculates water consumed
3. **Generate Bills**: Bills are created with usage charges + standing charges
4. **Carry Forward Balance**: Any previous unpaid amount is automatically added

### Creating Monthly Bills

#### Step 1: Select Billing Period
1. Go to "Billing" in the main menu
2. Select the month and year using the dropdown menus
3. The system will show existing bills for that period

#### Step 2: Create New Bills
1. Click "New Bill" button
2. Select the tenant from the dropdown
3. Enter meter readings:
   - **Previous Reading**: The system will auto-populate from last month
   - **Current Reading**: Enter the new meter reading
4. Set billing parameters:
   - **Rate per Unit**: Cost per cubic meter (usually preset)
   - **Standing Charge**: Fixed monthly charge (usually preset)
   - **Due Date**: When payment is expected

#### Step 3: Review and Save
1. The system automatically calculates:
   - Units used = Current Reading - Previous Reading
   - Water charges = Units Used × Rate per Unit
   - Total bill = Water Charges + Standing Charge + Previous Balance
2. Click "Save" to create the bill

### Bulk Billing (for multiple tenants)
1. Ensure all tenants have previous readings in the system
2. Use the "Generate All Bills" feature (if available)
3. Enter readings for multiple tenants at once
4. Review all bills before finalizing

### Editing Existing Bills
1. Find the bill in the billing list
2. Click "Edit" (pencil icon)
3. Modify readings or charges as needed
4. The system will recalculate automatically
5. Click "Update"

---

## Payment Recording

### Recording a Single Payment
1. Go to "Payments" in the main menu
2. Click "Record Payment" button
3. Select the tenant
4. Choose the billing period/bill
5. Enter payment details:
   - **Amount**: How much was paid
   - **Payment Date**: When payment was received
   - **Payment Method**: Cash, M-Pesa, Bank Transfer, etc.
   - **Notes**: Reference numbers, transaction IDs, etc.
6. Click "Record Payment"

### Understanding Payment Information
When you select a bill, the system shows:
- **Bill Amount**: Original water charges for that month
- **Previous Balance**: Any unpaid amount from previous months
- **Total Due**: Bill Amount + Previous Balance
- **Paid So Far**: Total payments received for this bill
- **Outstanding Balance**: Remaining amount owed

### Payment Options
- **Full Payment**: Pay the entire outstanding balance
- **Partial Payment**: Pay part of the balance (remainder carries forward)
- **Overpayment**: Pay more than owed (creates credit for next month)

### Editing Payments
1. Find the payment in the payments list
2. Click "Edit" (pencil icon)
3. Modify payment details
4. Click "Update Payment"

### Deleting Payments
1. Find the payment in the payments list
2. Click "Delete" (trash icon)
3. Confirm deletion
4. The bill balance will be automatically recalculated

---

## Communications

### Sending Messages to Tenants
1. Go to "Communications" in the main menu
2. Click "Send Message" button
3. Choose communication type:
   - **SMS**: Text message to phone
   - **Email**: Email message
   - **Bulk SMS**: Message to multiple tenants
4. Select recipients (individual or group)
5. Write your message
6. Click "Send"

### Message Templates
Common message types:
- **Bill Notifications**: "Your water bill for [Month] is ready: [Amount]"
- **Payment Reminders**: "Payment of [Amount] is due on [Date]"
- **Overdue Notices**: "Your account is overdue. Please pay [Amount] immediately"

### Communication History
- View all sent messages in the communications log
- Track delivery status (sent, delivered, failed)
- Resend failed messages if needed

---

## Reports & Exports

### Exporting Data
1. Navigate to the page with data you want to export (Tenants, Billing, Payments)
2. Click the "Export" button
3. Choose the date range (if applicable)
4. The system will download an Excel file

### Available Reports
- **Tenant List**: Complete tenant information
- **Monthly Billing**: All bills for a specific month
- **Payment History**: All payments within a date range
- **Outstanding Balances**: Tenants with unpaid bills
- **Usage Reports**: Water consumption statistics

### Using Exported Data
Exported Excel files can be used for:
- External accounting systems
- Government reporting
- Financial analysis
- Backup purposes

---

## Admin Management

### Adding New Administrators
1. Go to "Admin Invites" in the main menu
2. Click "Invite Admin" button
3. Enter administrator details:
   - **Email**: New admin's email address
   - **Full Name**: Administrator's name
   - **Role**: Admin or Superadmin
4. Click "Send Invite"
5. The new admin will receive an email with setup instructions

### Administrator Roles
- **Superadmin**: Full system access, can manage other admins
- **Admin**: Can manage tenants, billing, and payments
- **Clerk**: Limited access, mainly data entry

### Managing Existing Admins
- View all administrators and their roles
- Resend invitations if needed
- Change administrator roles (Superadmin only)

---

## Audit Logs

### What are Audit Logs?
Audit logs track every action performed by clerks in the system, including:
- Creating, editing, or deleting records
- Who made the change
- When the change was made
- What was changed

### Viewing Audit Logs
1. Go to "Audit Logs" (Superadmin only)
2. Review the log entries
3. Each entry shows:
   - **User**: Who made the change
   - **Action**: What they did (INSERT, UPDATE, DELETE)
   - **Table**: Which data was affected
   - **Changes**: Details of what changed
   - **Timestamp**: When it happened

### Using Audit Logs
- Track down errors or discrepancies
- Monitor user activity
- Ensure data integrity
- Compliance and accountability

---

## System Features

### Automatic Balance Carry-Forward
**How it works:**
- When you create a new bill, the system automatically looks at the previous month's balance
- Any unpaid amount is added to the new bill as "Previous Balance"
- This ensures no debt is lost between months

**Example:**
- January bill: 1,500 KES, Paid: 1,000 KES, Balance: 500 KES
- February bill: 1,200 KES + 500 KES (previous balance) = 1,700 KES total due

### Automatic Calculations
The system automatically calculates:
- **Water Usage**: Current Reading - Previous Reading
- **Bill Amount**: (Usage × Rate) + Standing Charge
- **Current Balance**: (Bill Amount + Previous Balance) - Payments Made

### Data Validation
The system prevents common errors:
- Current reading cannot be less than previous reading
- Warns about unusually high consumption
- Prevents duplicate bills for the same month/tenant

---

## Troubleshooting

### Common Issues and Solutions

#### "Can't create bill - tenant not found"
**Solution**: Make sure the tenant exists in the system and is active

#### "Current reading is less than previous reading"
**Solution**: Check the meter reading carefully. If correct, the meter may have been replaced.

#### "No billing cycles found for payment"
**Solution**: Create a bill for the tenant before recording payments

#### "Export not working"
**Solution**: 
1. Check your internet connection
2. Try refreshing the page
3. Contact technical support if issue persists

#### "Tenant can't login to portal"
**Solution**:
1. Verify tenant has an email address in the system
2. Ensure tenant uses the correct email to register
3. Check if tenant account is active

### Getting Help
1. **Check this manual** for step-by-step instructions
2. **Contact technical support** for system issues
3. **Admin training** available for new users

### Best Practices
1. **Regular Backups**: Export data monthly for backup
2. **Meter Reading Schedule**: Read meters on the same dates each month
3. **Payment Recording**: Record payments promptly to maintain accurate balances
4. **Communication**: Send regular notifications to tenants about bills and payments
5. **Data Verification**: Double-check meter readings before creating bills

---

## System Maintenance

### Daily Tasks
- [ ] Record any payments received
- [ ] Respond to tenant communications
- [ ] Check for system notifications

### Monthly Tasks
- [ ] Read all water meters
- [ ] Create monthly bills
- [ ] Send bill notifications to tenants
- [ ] Export monthly reports

### Weekly Tasks
- [ ] Send payment reminders for overdue accounts
- [ ] Review outstanding balances
- [ ] Check audit logs for any issues

---

## Contact Information

### Technical Support
- **Email**: [Your support email]
- **Phone**: [Your support phone]
- **Hours**: [Your support hours]

### Training and Setup
- **New Admin Training**: [Training information]
- **System Setup**: [Setup contact information]

---

*Last Updated: [Current Date]*
*System Version: 1.0*

---

**Remember**: This system is designed to make water billing simple and accurate. When in doubt, refer to this manual or contact support. Always double-check important data before making changes that affect tenant bills or payments.