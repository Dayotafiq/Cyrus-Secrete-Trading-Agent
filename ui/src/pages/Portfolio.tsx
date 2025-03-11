
import { useState } from 'react';
import { ArrowUp, ArrowDown, X, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

// Mock data for active trades
const mockTrades = [
  {
    id: 'trade1',
    token: 'ATOM',
    direction: 'long',
    entryPrice: 9.42,
    currentPrice: 10.15,
    amount: 50,
    profitLoss: 36.5,
    profitLossPercentage: 7.75,
  },
  {
    id: 'trade2',
    token: 'OSMO',
    direction: 'short',
    entryPrice: 0.68,
    currentPrice: 0.62,
    amount: 200,
    profitLoss: 12.0,
    profitLossPercentage: 8.82,
  },
  {
    id: 'trade3',
    token: 'JUNO',
    direction: 'long',
    entryPrice: 0.28,
    currentPrice: 0.26,
    amount: 100,
    profitLoss: -7.14,
    profitLossPercentage: -7.14,
  },
  {
    id: 'trade4',
    token: 'AKT',
    direction: 'long',
    entryPrice: 1.64,
    currentPrice: 1.89,
    amount: 75,
    profitLoss: 18.75,
    profitLossPercentage: 15.24,
  },
  {
    id: 'trade5',
    token: 'STARS',
    direction: 'short',
    entryPrice: 0.024,
    currentPrice: 0.026,
    amount: 1000,
    profitLoss: -2.0,
    profitLossPercentage: -8.33,
  },
];

const Portfolio = () => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCloseTrade = (id: string, token: string) => {
    // In a real app, this would call the API to close the trade
    toast({
      title: "Closing Trade",
      description: `Closing ${token} trade...`,
    });
    
    // Simulate API call delay
    setTimeout(() => {
      toast({
        title: "Trade Closed",
        description: `Your ${token} position has been closed`,
      });
    }, 1500);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const totalProfitLoss = mockTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const totalInvested = mockTrades.reduce((sum, trade) => sum + (trade.entryPrice * trade.amount), 0);
  const totalProfitLossPercentage = (totalProfitLoss / totalInvested) * 100;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-medium">Active Positions</h2>
          <p className="text-sm text-cyrus-textSecondary mt-1">
            {mockTrades.length} active trades
          </p>
        </div>
        
        <div className="cyrus-card py-2 px-4 inline-flex items-center hover-lift">
          <span className="text-sm text-cyrus-textSecondary mr-2">Total P/L:</span>
          <span className={`font-medium ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(totalProfitLoss)} ({formatPercentage(totalProfitLossPercentage)})
          </span>
        </div>
      </div>
      
      <div className="cyrus-card overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyrus-border/30">
                <th className="text-left py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Token</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Direction</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Entry Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Current Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">P/L</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockTrades.map((trade, index) => (
                <>
                  <tr 
                    key={trade.id} 
                    className="border-b border-cyrus-border/30 hover:bg-cyrus-card/70 cursor-pointer transition-all duration-300"
                    onClick={() => toggleRow(trade.id)}
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animation: 'slideInUp 0.4s ease forwards',
                      opacity: 0,
                      transform: 'translateY(10px)'
                    }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        {expandedRows[trade.id] ? 
                          <ChevronDown size={16} className="mr-2 text-cyrus-accent/80 transition-transform duration-300" /> : 
                          <ChevronRight size={16} className="mr-2 transition-transform duration-300" />
                        }
                        <span className="font-medium">{trade.token}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors duration-300 ${
                        trade.direction === 'long' 
                          ? 'bg-green-500/5 text-green-400' 
                          : 'bg-red-500/5 text-red-400'
                      }`}>
                        {trade.direction === 'long' ? <ArrowUp size={12} className="mr-1" /> : <ArrowDown size={12} className="mr-1" />}
                        {trade.direction.toUpperCase()}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-cyrus-textSecondary">
                      ${trade.entryPrice.toFixed(4)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-cyrus-textSecondary">
                      ${trade.currentPrice.toFixed(4)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(trade.profitLoss)} ({formatPercentage(trade.profitLossPercentage)})
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTrade(trade.id, trade.token);
                        }}
                        className="inline-flex h-8 items-center justify-center rounded-md px-3 py-1 text-xs font-medium text-red-400 transition-all duration-300 hover:bg-red-500/10 focus:outline-none"
                      >
                        <X size={14} className="mr-1" />
                        Close
                      </button>
                    </td>
                  </tr>
                  {expandedRows[trade.id] && (
                    <tr className="bg-cyrus-background/30">
                      <td colSpan={6} className="px-4 py-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 rounded-md bg-cyrus-background/30 border border-cyrus-border/30 hover-lift">
                            <div className="text-xs text-cyrus-textSecondary mb-1">Position Size</div>
                            <div className="font-medium">{trade.amount} {trade.token}</div>
                          </div>
                          <div className="p-3 rounded-md bg-cyrus-background/30 border border-cyrus-border/30 hover-lift">
                            <div className="text-xs text-cyrus-textSecondary mb-1">Invested Amount</div>
                            <div className="font-medium">{formatCurrency(trade.entryPrice * trade.amount)}</div>
                          </div>
                          <div className="p-3 rounded-md bg-cyrus-background/30 border border-cyrus-border/30 hover-lift">
                            <div className="text-xs text-cyrus-textSecondary mb-1">Current Value</div>
                            <div className="font-medium">{formatCurrency(trade.currentPrice * trade.amount)}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
