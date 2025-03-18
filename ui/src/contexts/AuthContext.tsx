
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";

type User = {
  walletAddress: string;
  sessionId: string;
  totalCapital: number;
  bridgedCapital: number;
  activeCapital: number;
  isActive: boolean;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // login: (walletAddress: string, signature: string, nonce: string, timestamp: string) => Promise<void>;
  login: (walletAddress: string) => Promise<void>;
  logout: () => void;
  toggleAgentStatus: () => Promise<void>;
  refreshUserData: () => Promise<void>;
};

// Production API URL - replace with your actual backend URL
const API_URL = 'https://api.cyrus-ai.com';
const SIMULATION_DELAY = 800; // ms to simulate network latency

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const sessionId = localStorage.getItem('cyrus_session_id');
        const walletAddress = localStorage.getItem('cyrus_wallet_address');
        
        if (!sessionId || !walletAddress) {
          setIsLoading(false);
          return;
        }
        
      //   // In production, validate the session with your backend
      //   const response = await fetch(`${API_URL}/api/user/validate-session`, {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({ sessionId, walletAddress }),
      //   });
        
      //   if (response.ok) {
      //     const userData = await response.json();
      //     setUser({
      //       walletAddress,
      //       sessionId,
      //       totalCapital: userData.totalCapital || 0,
      //       bridgedCapital: userData.bridgedCapital || 0,
      //       activeCapital: userData.activeCapital || 0,
      //       isActive: userData.isActive || false
      //     });
      //   } else {
      //     // Session invalid, clean up localStorage
      //     localStorage.removeItem('cyrus_session_id');
      //     localStorage.removeItem('cyrus_wallet_address');
      //   }
      // } catch (error) {
       // Simulate session validation
       await new Promise(resolve => setTimeout(resolve, SIMULATION_DELAY));
        
       // Simulate user data
       setUser({
         walletAddress,
         sessionId,
         totalCapital: 25000,
         bridgedCapital: 15000,
         activeCapital: 10000,
         isActive: true
       });
     } catch (error) {
       console.error('Session validation error:', error);
       localStorage.removeItem('cyrus_session_id');
       localStorage.removeItem('cyrus_wallet_address');
        // console.error('Session validation error:', error);
        
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const refreshUserData = async () => {
    if (!user?.sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // const response = await fetch(`${API_URL}/api/user/data`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${user.sessionId}`
      //   }
      // });
      
      // if (response.ok) {
      //   const userData = await response.json();
      //   setUser(prevUser => ({
      //     ...prevUser!,
      //     totalCapital: userData.totalCapital || 0,
      //     bridgedCapital: userData.bridgedCapital || 0,
      //     activeCapital: userData.activeCapital || 0,
      //     isActive: userData.isActive || false
      //   }));
      // } else {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to fetch user data');
      // }
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, SIMULATION_DELAY));
      
      // Simulate updated user data
      setUser(prevUser => ({
        ...prevUser!,
        totalCapital: 25000,
        bridgedCapital: 15000,
        activeCapital: 10000,
        isActive: prevUser?.isActive || false
      }));
    } catch (error) {
      console.error('Error refreshing user data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your trading data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // const login = async (walletAddress: string, signature: string, nonce: string, timestamp: string) => {
  //   try {
  //     setIsLoading(true);
      
  //     const response = await fetch(`${API_URL}/api/auth/login`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         walletAddress,
  //         signature,
  //         nonce,
  //         timestamp
  //       })
  //     });
      
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || 'Authentication failed');
  //     }
      
  //     const data = await response.json();
  //     const sessionId = data.sessionId;
  const login = async (walletAddress: string) => {
    try {
      setIsLoading(true);
      
      // Simulate login API call
      await new Promise(resolve => setTimeout(resolve, SIMULATION_DELAY));
      
      // Simulate successful response
      const sessionId = `sim_${Math.random().toString(36).substring(2, 15)}`;
      
      // Store in localStorage
      localStorage.setItem('cyrus_session_id', sessionId);
      localStorage.setItem('cyrus_wallet_address', walletAddress);

      // Set the user state
      setUser({
        walletAddress,
        sessionId,
        // totalCapital: data.totalCapital || 0,
        // bridgedCapital: data.bridgedCapital || 0,
        // activeCapital: data.activeCapital || 0,
        // isActive: data.isActive || false
        totalCapital: 25000,
        bridgedCapital: 15000,
        activeCapital: 10000,
        isActive: true
      });

      toast({
        title: "Authentication Successful",
        description: "Welcome to Cyrus AI",
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // In a real app, you might want to notify the backend about the logout
    // const performLogout = async () => {
    //   try {
    //     if (user?.sessionId) {
    //       await fetch(`${API_URL}/api/auth/logout`, {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json',
    //           'Authorization': `Bearer ${user.sessionId}`
    //         }
    //       });
    //     }
    //   } catch (error) {
    //     console.error('Logout error:', error);
    //   } finally {
    //     localStorage.removeItem('cyrus_session_id');
    //     localStorage.removeItem('cyrus_wallet_address');
    //     setUser(null);
    //   }
    // };
    
    // performLogout();
    // Simulate logout
    localStorage.removeItem('cyrus_session_id');
    localStorage.removeItem('cyrus_wallet_address');
    setUser(null);
  };

  // const toggleAgentStatus = async () => {
  //   if (!user?.sessionId) return;

  //   try {
  //     const response = await fetch(`${API_URL}/api/trading/toggle-status`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${user.sessionId}`
  //       }
  //     });
      
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || 'Failed to toggle agent status');
  //     }
      
  //     const data = await response.json();
  const toggleAgentStatus = async () => {
    if (!user) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, SIMULATION_DELAY));
      
      // Toggle the isActive status
      const newStatus = !user.isActive;
      // Update the user state with the new isActive status
      setUser(prevUser => ({
        ...prevUser!,
        // isActive: data.isActive
        isActive: newStatus
      }));

      toast({
        // title: data.isActive ? "Agent Activated" : "Agent Paused",
        // description: data.isActive
        title: newStatus ? "Agent Activated" : "Agent Paused",
        description: newStatus  
          ? "Cyrus AI is now actively trading"
          : "Trading operations have been paused",
      });
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update trading agent status",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      toggleAgentStatus,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
