
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "@/hooks/use-toast";

// Define Keplr and related types
declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => any;
      signArbitrary: (
        chainId: string,
        signer: string,
        data: string
      ) => Promise<{ signature: Uint8Array; pub_key: { type: string; value: string } }>;
    };
  }
}

// Chain ID for Cosmos
const CHAIN_ID = "cosmoshub-4";

const Auth = () => {
  const { isAuthenticated, login, isLoading } = useAuth();
  const [nonce, setNonce] = useState<string>('');
  const [timestamp, setTimestamp] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [keplrAvailable, setKeplrAvailable] = useState(false);

  useEffect(() => {
    // Generate a random nonce
    const generateNonce = () => {
      const randomBytes = new Uint8Array(16);
      window.crypto.getRandomValues(randomBytes);
      return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };

    setNonce(generateNonce());
    setTimestamp(Date.now().toString());

    // Check if Keplr is available
    const checkKeplrAvailable = async () => {
      if (window.keplr) {
        setKeplrAvailable(true);
      } else {
        // Wait for Keplr to be injected into the window
        const keplrCheckInterval = setInterval(() => {
          if (window.keplr) {
            setKeplrAvailable(true);
            clearInterval(keplrCheckInterval);
          }
        }, 500);

        // Clear interval after 10 seconds if Keplr is not detected
        setTimeout(() => {
          clearInterval(keplrCheckInterval);
        }, 10000);
      }
    };

    checkKeplrAvailable();
  }, []);

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);

      if (!window.keplr) {
        throw new Error("Keplr wallet extension is not installed");
      }

      // Enable Keplr for the Cosmos chain
      await window.keplr.enable(CHAIN_ID);

      // Get the offline signer
      const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
      const accounts = await offlineSigner.getAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in Keplr");
      }

      const walletAddress = accounts[0].address;
      
      // Create message to sign
      const message = `Sign this message to authenticate with Cyrus AI\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
      
      // Sign the message
      const signResponse = await window.keplr.signArbitrary(
        CHAIN_ID,
        walletAddress,
        message
      );
      
      // Convert signature to base64
      const signatureBytes = signResponse.signature;
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
      
      // Call the login function with the wallet address and signature
      await login(walletAddress, signatureBase64, nonce, timestamp);
      
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Could not connect to Keplr wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-cyrus-background">
      <div className="animate-fadeIn w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gradient">Cyrus AI</h1>
          <p className="mt-3 text-xl text-cyrus-textSecondary">
            Advanced cryptocurrency trading agent
          </p>
        </div>
        
        <div className="cyrus-card mt-10 animate-float">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-cyrus-text">Authentication Required</h2>
              <p className="text-sm text-cyrus-textSecondary">
                Connect your Keplr wallet to access the Cyrus AI trading platform
              </p>
              {!keplrAvailable && (
                <p className="text-xs text-yellow-500 mt-2 p-2 bg-yellow-500/10 rounded-md">
                  Keplr wallet extension not detected. Please install the Keplr browser extension.
                </p>
              )}
            </div>
            
            <div className="space-y-2 p-3 rounded-md bg-cyrus-background/50 border border-cyrus-border">
              <div className="flex justify-between">
                <span className="text-xs text-cyrus-textSecondary">Nonce:</span>
                <span className="text-xs font-mono text-cyrus-accent">{nonce.substring(0, 8)}...{nonce.substring(nonce.length-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-cyrus-textSecondary">Timestamp:</span>
                <span className="text-xs font-mono text-cyrus-accent">
                  {new Date(parseInt(timestamp)).toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting || isLoading || !keplrAvailable}
              className="cyrus-button w-full relative overflow-hidden group"
            >
              {isConnecting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 transition-transform group-hover:-rotate-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 6L10 18.5M5.5 8.5L2 12L5.5 15.5M18.5 8.5L22 12L18.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {!keplrAvailable ? "Install Keplr" : "Connect with Keplr"}
                </span>
              )}
              <div className="absolute inset-0 -z-10 bg-gradient-radial from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {!keplrAvailable && (
              <a
                href="https://www.keplr.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-center text-xs text-cyrus-accent hover:underline"
              >
                Get Keplr Wallet
              </a>
            )}
          </div>
        </div>
        
        <p className="mt-4 text-center text-xs text-cyrus-textSecondary">
          By connecting your wallet, you agree to the Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
