import { formatKES } from './utils';

export type ExportData = {
  [key: string]: string | number | null;
};

export const exportToCSV = (data: ExportData[], filename: string) => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from the first row
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const formatTenantDataForExport = (tenants: any[]): ExportData[] => {
  return tenants.map(tenant => ({
    'Name': tenant.name,
    'Unit Number': tenant.house_unit_number,
    'Meter Number': tenant.meter_connection_number,
    'Phone': tenant.phone,
    'Email': tenant.email || '',
    'Status': tenant.status,
    'Created Date': new Date(tenant.created_at).toLocaleDateString()
  }));
};

export const formatBillingDataForExport = (bills: any[]): ExportData[] => {
  return bills.map(bill => ({
    'Tenant': bill.tenant?.name || 'Unknown',
    'Unit': bill.tenant?.house_unit_number || '',
    'Month': bill.month,
    'Year': bill.year,
    'Previous Reading': bill.previous_reading,
    'Current Reading': bill.current_reading,
    'Units Used': bill.units_used || 0,
    'Rate per Unit': formatKES(bill.rate_per_unit),
    'Bill Amount': formatKES(bill.bill_amount || 0),
    'Previous Balance': formatKES(bill.previous_balance),
    'Total Due': formatKES((bill.bill_amount || 0) + bill.previous_balance),
    'Paid Amount': formatKES(bill.paid_amount),
    'Current Balance': formatKES(bill.current_balance || 0),
    'Bill Date': new Date(bill.bill_date).toLocaleDateString(),
    'Due Date': new Date(bill.due_date).toLocaleDateString()
  }));
};

export const formatPaymentDataForExport = (payments: any[]): ExportData[] => {
  return payments.map(payment => ({
    'Tenant': payment.tenant?.name || 'Unknown',
    'Unit': payment.tenant?.house_unit_number || '',
    'Amount': formatKES(payment.amount),
    'Payment Date': new Date(payment.payment_date).toLocaleDateString(),
    'Payment Method': payment.payment_method || 'cash',
    'Notes': payment.notes || '',
    'Created Date': new Date(payment.created_at).toLocaleDateString()
  }));
};

export const formatMeterReadingDataForExport = (readings: any[]): ExportData[] => {
  return readings.map(reading => ({
    'Tenant': reading.tenants?.name || 'Unknown',
    'Unit': reading.tenants?.house_unit_number || '',
    'Month': reading.month,
    'Year': reading.year,
    'Previous Reading': reading.previous_reading,
    'Current Reading': reading.current_reading,
    'Units Used': reading.units_used || 0,
    'Bill Amount': formatKES(reading.bill_amount || 0),
    'Reading Date': new Date(reading.created_at).toLocaleDateString()
  }));
};

export const formatCommunicationDataForExport = (communications: any[]): ExportData[] => {
  return communications.map(comm => ({
    'Tenant': comm.tenant?.name || 'Unknown',
    'Type': comm.type.toUpperCase(),
    'Subject': comm.subject || '',
    'Message': comm.message,
    'Status': comm.status,
    'Sent Date': new Date(comm.sent_at).toLocaleDateString(),
    'Sent Time': new Date(comm.sent_at).toLocaleTimeString()
  }));
};

export const parseCSV = (csvText: string): { [key: string]: string }[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
    }

    const row: { [key: string]: string } = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }

  return data;
};