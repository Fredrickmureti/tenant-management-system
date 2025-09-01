import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import ThemeToggle from '@/components/ThemeToggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Droplets, 
  Menu, 
  Users, 
  Receipt, 
  DollarSign, 
  BarChart3, 
  MessageSquare,
  LogOut,
  X,
  ChevronsLeft,
  ChevronsRight,
  UserPlus,
  Eye,
  Shield,
} from 'lucide-react';

const Layout = () => {
  const { user, signOut, loading } = useAuth();
  const { canManageAdmins, canViewAuditLogs, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Tenants', href: '/tenants', icon: Users },
    { name: 'Meter Readings', href: '/meter-readings', icon: Droplets },
    { name: 'Billing', href: '/billing', icon: Receipt },
    { name: 'Payments', href: '/payments', icon: DollarSign },
    { name: 'Communications', href: '/communications', icon: MessageSquare },
    ...(canManageAdmins ? [{ name: 'Admin Invites', href: '/admin-invites', icon: UserPlus }] : []),
    ...(canViewAuditLogs ? [{ name: 'Audit Logs', href: '/audit-logs', icon: Eye }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  // Find current page name
  const currentPageName = navigation.find((n) => n.href === location.pathname)?.name || 'Dashboard';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed on left side */}
      <div
        className={`fixed inset-y-0 left-0 z-50 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-card border-r transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-all duration-300 ease-in-out lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex h-14 items-center justify-between px-4 border-b">
            <div className="flex items-center space-x-2">
              <Droplets className="h-6 w-6 text-primary" />
              {!sidebarCollapsed && <span className="text-lg font-semibold">Water Billing</span>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const link = (
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center ${
                      sidebarCollapsed ? 'justify-center' : ''
                    } px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
                return (
                  <li key={item.name}>
                    {sidebarCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="border-t p-3">
            <div className={`flex ${sidebarCollapsed ? 'justify-center' : 'justify-between'} items-center gap-2`}>
              {!sidebarCollapsed && <span className="text-sm text-muted-foreground">Admin</span>}
              <div className="flex items-center gap-1">
                <ThemeToggle />
                {sidebarCollapsed ? (
                  <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                    <LogOut className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content wrapper - takes remaining width */}
      <div className={`flex-1 flex flex-col ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        {/* Top bar - mobile only menu button and page title */}
        <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center px-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-base font-medium">{currentPageName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">Welcome back, Admin</span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content - fills remaining height */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-4 px-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;