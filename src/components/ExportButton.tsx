import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { ExportData, exportToCSV } from '@/lib/export-utils';

interface ExportButtonProps {
  data: any[];
  filename: string;
  formatData: (data: any[]) => ExportData[];
  disabled?: boolean;
  className?: string;
}

export const ExportButton = ({ 
  data, 
  filename, 
  formatData, 
  disabled = false,
  className = "" 
}: ExportButtonProps) => {
  const { canExport, loading } = useUserRole();
  const { toast } = useToast();

  const handleExport = () => {
    if (!canExport) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to export data.",
        variant: "destructive",
      });
      return;
    }

    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "There's no data to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formattedData = formatData(data);
      exportToCSV(formattedData, filename);
      
      toast({
        title: "Export Successful",
        description: `${data.length} records exported to ${filename}.csv`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      });
    }
  };

  if (loading || !canExport) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
};