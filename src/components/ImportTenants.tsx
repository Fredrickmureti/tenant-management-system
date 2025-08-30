import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseCSV } from '@/lib/export-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportTenantsProps {
  onImportComplete: () => void;
}

export const ImportTenants = ({ onImportComplete }: ImportTenantsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canImport, loading } = useUserRole();
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Preview the file
    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);
      setPreview(data.slice(0, 3)); // Show first 3 rows as preview
    } catch (error) {
      toast({
        title: "File Error",
        description: "Could not parse the CSV file. Please check the format.",
        variant: "destructive",
      });
      setFile(null);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = parseCSV(text);

      // Validate required columns
      const requiredColumns = ['Name', 'Phone', 'Unit Number', 'Meter Number'];
      const headers = Object.keys(data[0] || {});
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        toast({
          title: "Missing Columns",
          description: `The following required columns are missing: ${missingColumns.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Transform data for database
      const tenants = data.map(row => ({
        name: row['Name']?.trim(),
        phone: row['Phone']?.trim(),
        email: row['Email']?.trim() || null,
        house_unit_number: row['Unit Number']?.trim(),
        meter_connection_number: row['Meter Number']?.trim(),
        status: row['Status']?.toLowerCase() === 'vacated' ? 'vacated' : 'active'
      }));

      // Validate data
      const invalidRows = tenants.filter((tenant, index) => 
        !tenant.name || !tenant.phone || !tenant.house_unit_number || !tenant.meter_connection_number
      );

      if (invalidRows.length > 0) {
        toast({
          title: "Invalid Data",
          description: `${invalidRows.length} rows have missing required fields and will be skipped.`,
          variant: "destructive",
        });
      }

      const validTenants = tenants.filter(tenant => 
        tenant.name && tenant.phone && tenant.house_unit_number && tenant.meter_connection_number
      );

      if (validTenants.length === 0) {
        toast({
          title: "No Valid Data",
          description: "No valid tenant records found in the file.",
          variant: "destructive",
        });
        return;
      }

      // Insert tenants
      const { data: insertedData, error } = await supabase
        .from('tenants')
        .insert(validTenants)
        .select();

      if (error) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Import Successful",
        description: `${insertedData.length} tenants imported successfully.`,
      });

      // Clean up
      setFile(null);
      setPreview([]);
      setIsOpen(false);
      onImportComplete();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "There was an error importing the data.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'Name,Phone,Email,Unit Number,Meter Number,Status',
      'John Doe,+254700000000,john@example.com,A1,MCN12345,active',
      'Jane Smith,+254700000001,jane@example.com,A2,MCN12346,active'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tenant-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !canImport) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Tenants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file with tenant data. Required columns: Name, Phone, Unit Number, Meter Number.
            </AlertDescription>
          </Alert>

          <div className="flex justify-between items-center">
            <Label>Download Template</Label>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template CSV
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 3 rows)</Label>
              <div className="border rounded p-2 text-sm space-y-1 max-h-32 overflow-y-auto">
                {preview.map((row, index) => (
                  <div key={index} className="text-xs">
                    <strong>Row {index + 1}:</strong> {JSON.stringify(row)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsOpen(false);
                setFile(null);
                setPreview([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? (
                <>
                  <FileText className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};