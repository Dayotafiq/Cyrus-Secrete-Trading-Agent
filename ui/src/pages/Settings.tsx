
import { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

type IndicatorSettings = {
  name: string;
  description: string;
  weight: number;
  key: string;
};

const defaultSettings: Record<string, IndicatorSettings[]> = {
  technical: [
    {
      name: 'ICT Concepts',
      description: 'Institutional Candle Theory framework',
      weight: 25,
      key: 'ict',
    },
    {
      name: 'Elliott Wave',
      description: 'Wave pattern analysis',
      weight: 20,
      key: 'elliott',
    },
    {
      name: 'Moving Averages',
      description: 'EMA crossovers and trends',
      weight: 15,
      key: 'ema',
    },
    {
      name: 'RSI',
      description: 'Relative Strength Index',
      weight: 15,
      key: 'rsi',
    },
    {
      name: 'Wyckoff Method',
      description: 'Market structure analysis',
      weight: 25,
      key: 'wyckoff',
    },
  ],
  fundamental: [
    {
      name: 'Tokenomics',
      description: 'Token supply and distribution metrics',
      weight: 30,
      key: 'tokenomics',
    },
    {
      name: 'On-chain Activity',
      description: 'Network usage and transaction volume',
      weight: 25,
      key: 'onchain',
    },
    {
      name: 'Ecosystem Growth',
      description: 'Development activity and adoption',
      weight: 25,
      key: 'ecosystem',
    },
    {
      name: 'TVL Trends',
      description: 'Total Value Locked growth patterns',
      weight: 20,
      key: 'tvl',
    },
  ],
  sentiment: [
    {
      name: 'Social Volume',
      description: 'Mentions across social platforms',
      weight: 20,
      key: 'social',
    },
    {
      name: 'Whale Activity',
      description: 'Large holder behavior',
      weight: 30,
      key: 'whale',
    },
    {
      name: 'Market Sentiment',
      description: 'Overall market mood and direction',
      weight: 25,
      key: 'market',
    },
    {
      name: 'Funding Rates',
      description: 'Perpetual swap funding analysis',
      weight: 25,
      key: 'funding',
    },
  ],
};

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'technical' | 'fundamental' | 'sentiment'>('technical');

  const handleWeightChange = (category: string, key: string, value: number) => {
    const newSettings = { ...settings };
    
    // Find the indicator to update
    const indicator = newSettings[category].find(ind => ind.key === key);
    if (!indicator) return;
    
    // Calculate the current total weight for this category
    const currentTotal = newSettings[category].reduce((sum, ind) => sum + ind.weight, 0);
    
    // Calculate the difference from the change
    const diff = value - indicator.weight;
    
    // Make sure weights sum to 100 by adjusting other weights proportionally
    if (currentTotal + diff !== 100) {
      const othersTotal = currentTotal - indicator.weight;
      const factor = (100 - value) / othersTotal;
      
      // Adjust other indicators' weights
      newSettings[category] = newSettings[category].map(ind => {
        if (ind.key === key) {
          return { ...ind, weight: value };
        } else {
          // Proportionally adjust other weights
          const adjustedWeight = Math.round(ind.weight * factor);
          return { ...ind, weight: adjustedWeight };
        }
      });
      
      // Ensure weights sum to exactly 100 by adjusting the first non-updated indicator
      const newTotal = newSettings[category].reduce((sum, ind) => sum + ind.weight, 0);
      if (newTotal !== 100) {
        const diff = 100 - newTotal;
        const firstOtherInd = newSettings[category].find(ind => ind.key !== key);
        if (firstOtherInd) {
          firstOtherInd.weight += diff;
        }
      }
    } else {
      // Simple case - just update the weight
      indicator.weight = value;
    }
    
    setSettings(newSettings);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // In a real app, this would send the settings to the backend
    toast({
      title: "Saving Settings",
      description: "Updating your trading parameters...",
    });
    
    // Simulate API call delay
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Saved",
        description: "Your trading parameters have been updated",
      });
    }, 1500);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast({
      title: "Settings Reset",
      description: "Trading parameters have been reset to default values",
    });
  };

  const totalByCategory = (category: string) => {
    return settings[category].reduce((sum, ind) => sum + ind.weight, 0);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-medium">Trading Parameters</h2>
          <p className="text-sm text-cyrus-textSecondary mt-1">
            Configure how Cyrus AI evaluates trading opportunities
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleReset}
            className="cyrus-button-secondary"
          >
            <RefreshCw size={16} className="mr-2" />
            Reset to Default
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="cyrus-button relative overflow-hidden group"
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <Save size={16} className="mr-2" />
                Save Settings
              </span>
            )}
            <div className="absolute inset-0 -z-10 bg-gradient-radial from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
      
      <div className="cyrus-card">
        <div className="mb-4 flex border-b border-cyrus-border">
          <button
            onClick={() => setActiveTab('technical')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'technical' 
                ? 'text-cyrus-accent' 
                : 'text-cyrus-textSecondary hover:text-cyrus-text'
            }`}
          >
            Technical Analysis
            {activeTab === 'technical' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyrus-accent"></span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('fundamental')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'fundamental' 
                ? 'text-cyrus-accent' 
                : 'text-cyrus-textSecondary hover:text-cyrus-text'
            }`}
          >
            Fundamental Analysis
            {activeTab === 'fundamental' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyrus-accent"></span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('sentiment')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'sentiment' 
                ? 'text-cyrus-accent' 
                : 'text-cyrus-textSecondary hover:text-cyrus-text'
            }`}
          >
            Market Sentiment
            {activeTab === 'sentiment' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyrus-accent"></span>
            )}
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">Indicator Weights</div>
            <div className={`text-sm ${
              totalByCategory(activeTab) === 100 
                ? 'text-cyrus-accent' 
                : 'text-cyrus-danger'
            }`}>
              Total: {totalByCategory(activeTab)}%
            </div>
          </div>
          
          <div className="space-y-6">
            {settings[activeTab].map((indicator) => (
              <div key={indicator.key} className="space-y-2">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{indicator.name}</div>
                    <div className="text-xs text-cyrus-textSecondary">{indicator.description}</div>
                  </div>
                  <div className="text-right text-sm font-mono">
                    {indicator.weight}%
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={indicator.weight}
                    onChange={(e) => handleWeightChange(activeTab, indicator.key, parseInt(e.target.value))}
                    className="w-full h-2 appearance-none rounded-full bg-cyrus-border outline-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, #00E676 0%, #00E676 ${indicator.weight}%, #333333 ${indicator.weight}%, #333333 100%)`,
                    }}
                  />
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWeightChange(activeTab, indicator.key, Math.max(5, indicator.weight - 5))}
                      className="cyrus-button-secondary h-6 w-6 p-0 flex items-center justify-center"
                    >
                      -
                    </button>
                    
                    <button
                      onClick={() => handleWeightChange(activeTab, indicator.key, Math.min(50, indicator.weight + 5))}
                      className="cyrus-button-secondary h-6 w-6 p-0 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="cyrus-card">
        <div className="text-sm font-medium mb-3">Strategy Optimization</div>
        <p className="text-sm text-cyrus-textSecondary mb-4">
          The weights above determine how much emphasis Cyrus AI places on different indicators when making trading decisions. Adjust these parameters to optimize the strategy based on your risk tolerance and market preferences.
        </p>
        
        <div className="p-3 rounded-md bg-cyrus-accent/10 border border-cyrus-accent/30 text-sm">
          <div className="font-medium text-cyrus-accent mb-1">Recommendation</div>
          <p className="text-cyrus-textSecondary">
            For volatile markets, consider increasing weights for technical indicators. For long-term positions, fundamental analysis may provide more stable signals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
