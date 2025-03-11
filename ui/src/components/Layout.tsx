
import { useState, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  PieChart, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X,
  Activity
} from 'lucide-react';

type SidebarLinkProps = {
  icon: React.ReactNode;
  text: string;
  to: string;
  isActive: boolean;
  onClick?: () => void;
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ 
  icon, 
  text, 
  to, 
  isActive,
  onClick 
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-300 ${
      isActive 
        ? 'bg-cyrus-accent/10 text-cyrus-accent/90' 
        : 'text-cyrus-textSecondary hover:bg-cyrus-card/60 hover:text-cyrus-text'
    }`}
  >
    {icon}
    <span>{text}</span>
    {isActive && (
      <span className="ml-auto block h-1.5 w-1.5 rounded-full bg-cyrus-accent/80 animate-pulse" />
    )}
  </Link>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    // Close sidebar when route changes on mobile
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    
    // Add page transition animation reset
    setIsPageLoaded(false);
    const timer = setTimeout(() => setIsPageLoaded(true), 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname, isMobile]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const sidebarLinks = [
    { 
      icon: <LayoutDashboard size={18} />, 
      text: 'Dashboard', 
      to: '/dashboard' 
    },
    { 
      icon: <PieChart size={18} />, 
      text: 'Portfolio', 
      to: '/portfolio' 
    },
    { 
      icon: <History size={18} />, 
      text: 'Trade History', 
      to: '/history' 
    },
    { 
      icon: <SettingsIcon size={18} />, 
      text: 'Settings', 
      to: '/settings' 
    },
  ];

  const sidebar = (
    <div 
      className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-cyrus-background border-r border-cyrus-border/50 transition-transform duration-300 ${
        isMobile ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-cyrus-border/50 px-6">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-cyrus-accent/80 to-sky-400/80 flex items-center justify-center shadow-sm">
              <Activity size={18} className="text-black" />
            </div>
            <span className="ml-2 text-lg font-medium text-cyrus-text">Cyrus AI</span>
          </div>
          {isMobile && (
            <button 
              onClick={toggleSidebar} 
              className="ml-auto text-cyrus-textSecondary hover:text-cyrus-text transition-colors duration-200"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-auto py-4 px-3">
          <nav className="space-y-1">
            {sidebarLinks.map((link, index) => (
              <div 
                key={link.to} 
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  opacity: 0,
                  animation: isPageLoaded ? 'fadeIn 0.5s ease forwards' : 'none'
                }}
              >
                <SidebarLink
                  icon={link.icon}
                  text={link.text}
                  to={link.to}
                  isActive={location.pathname === link.to}
                  onClick={isMobile ? toggleSidebar : undefined}
                />
              </div>
            ))}
          </nav>
        </div>
        
        <div className="border-t border-cyrus-border/50 p-4">
          <div className="mb-3 overflow-hidden rounded-md bg-cyrus-card/60 p-3 hover-lift">
            <div className="text-xs text-cyrus-textSecondary">Connected Wallet</div>
            <div className="mt-1 truncate text-sm font-mono">
              {user?.walletAddress.substring(0, 8)}...
              {user?.walletAddress.substring(user.walletAddress.length - 8)}
            </div>
          </div>
          
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-red-400 transition-colors duration-300 hover:bg-red-500/10"
          >
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-cyrus-background text-cyrus-text">
      {sidebar}
      
      <div className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : 'ml-64'}`}>
        <header className="flex h-16 items-center border-b border-cyrus-border/50 px-6">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="mr-4 text-cyrus-textSecondary hover:text-cyrus-text transition-colors duration-200"
            >
              <Menu size={18} />
            </button>
          )}
          <h1 className="text-lg font-medium">{sidebarLinks.find(link => link.to === location.pathname)?.text || 'Cyrus AI'}</h1>
        </header>
        
        <main className="overflow-auto p-6">
          <div className={`transition-opacity duration-300 ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
            {children}
          </div>
        </main>
      </div>
      
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default Layout;
