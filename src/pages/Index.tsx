import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { DropletIcon, UserCheck, Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full bg-blue-100">
              <DropletIcon className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Water Management System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your water billing, tenant management, and payment tracking with our comprehensive platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer" 
                onClick={() => navigate('/tenant-auth')}>
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 rounded-full bg-green-100">
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-xl">Tenant Portal</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Access your water bills, view outstanding balances, and track your payment history.
              </p>
              <Button className="w-full" onClick={(e) => {
                e.stopPropagation();
                navigate('/tenant-auth');
              }}>
                Tenant Login
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => navigate('/auth')}>
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 rounded-full bg-blue-100">
                  <Settings className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-xl">Admin Portal</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Manage tenants, create bills, process payments, and oversee the entire system.
              </p>
              <Button variant="outline" className="w-full" onClick={(e) => {
                e.stopPropagation();
                navigate('/auth');
              }}>
                Admin Login
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
