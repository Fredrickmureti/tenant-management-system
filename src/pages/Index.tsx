import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { DropletIcon, UserCheck, Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-full bg-blue-100">
              <DropletIcon className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Water Management Portal
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Access your water bills, view outstanding balances, and manage your account with ease.
          </p>
        </div>

        {/* Main Tenant Portal Card */}
        <div className="max-w-lg mx-auto mb-8">
          <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-blue-200" 
                onClick={() => navigate('/tenant-auth')}>
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 rounded-full bg-blue-100">
                  <UserCheck className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-blue-900">Tenant Portal</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 text-lg">
                Sign in to view your water bills, payment history, and account details.
              </p>
              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full text-lg py-3" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/tenant-auth');
                  }}
                >
                  Access Tenant Portal
                </Button>
                <p className="text-sm text-gray-500">
                  Don't have an account? Sign up to get started
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Small Admin Link */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 text-sm"
            onClick={() => navigate('/auth')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Administrator Access
          </Button>
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
