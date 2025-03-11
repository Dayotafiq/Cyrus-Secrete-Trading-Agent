
import { useState } from 'react';
import { ArrowUp, ArrowDown, Calendar, Search, ChevronRight, ChevronDown } from 'lucide-react';

// Mock data for trade history
const mockTradeHistory = [
  {
    id: 'hist1',
    token: 'ATOM',
    direction: 'long',
    entryPrice: 8.72,
    exitPrice: 9.45,
    entryTime: '2023-06-15T10:15:00Z',
    exitTime: '2023-06-17T14:30:00Z',
    amount: 30,
    profitLoss: 21.9,
    profitLossPercentage: 8.37,
    factors: {
      technical: 78,
      fundamental: 62,
      sentiment: 81
    }
  },
  {
    id: 'hist2',
    token: 'OSMO',
    direction: 'short',
    entryPrice: 0.78,
    exitPrice: 0.71,
    entryTime: '2023-06-12T09:20:00Z',
    exitTime: '2023-06-14T11:45:00Z',
    amount: 150,
    profitLoss: 10.5,
    profitLossPercentage: 8.97,
    factors: {
      technical: 65,
      fundamental: 58,
      sentiment: 72
    }
  },
  {
    id: 'hist3',
    token: 'JUNO',
    direction: 'long',
    entryPrice: 0.31,
    exitPrice: 0.28,
    entryTime: '2023-06-08T08:35:00Z',
    exitTime: '2023-06-11T16:20:00Z',
    amount: 80,
    profitLoss: -2.4,
    profitLossPercentage: -9.68,
    factors: {
      technical: 42,
      fundamental: 51,
      sentiment: 59
    }
  },
  {
    id: 'hist4',
    token: 'INJ',
    direction: 'long',
    entryPrice: 7.28,
    exitPrice: 8.15,
    entryTime: '2023-06-01T13:10:00Z',
    exitTime: '2023-06-05T10:30:00Z',
    amount: 15,
    profitLoss: 13.05,
    profitLossPercentage: 11.95,
    factors: {
      technical: 85,
      fundamental: 77,
      sentiment: 68
    }
  },
  {
    id: 'hist5',
    token: 'AKT',
    direction: 'short',
    entryPrice: 1.92,
    exitPrice: 2.05,
    entryTime: '2023-05-28T11:05:00Z',
    exitTime: '2023-05-31T09:15:00Z',
    amount: 50,
    profitLoss: -6.5,
    profitLossPercentage: -6.77,
    factors: {
      technical: 38,
      fundamental: 45,
      sentiment: 52
    }
  },
  {
    id: 'hist6',
    token: 'STARS',
    direction: 'long',
    entryPrice: 0.022,
    exitPrice: 0.025,
    entryTime: '2023-05-20T15:30:00Z',
    exitTime: '2023-05-25T16:45:00Z',
    amount: 1200,
    profitLoss: 3.6,
    profitLossPercentage: 13.64,
    factors: {
      technical: 72,
      fundamental: 68,
      sentiment: 75
    }
  },
];

const History = () => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTrades = mockTradeHistory.filter(trade => 
    trade.token.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = filteredTrades.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Calculate overall statistics
  const totalTrades = mockTradeHistory.length;
  const profitableTrades = mockTradeHistory.filter(trade => trade.profitLoss > 0).length;
  const winRate = (profitableTrades / totalTrades) * 100;
  const totalProfitLoss = mockTradeHistory.reduce((sum, trade) => sum + trade.profitLoss, 0);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-medium">Trade History</h2>
          <p className="text-sm text-cyrus-textSecondary mt-1">
            {totalTrades} completed trades
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyrus-textSecondary" />
            <input
              type="text"
              placeholder="Search by token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cyrus-input pl-9"
            />
          </div>
          
          <button className="cyrus-button-secondary">
            <Calendar size={16} className="mr-2" />
            Date Range
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: "Win Rate",
            value: `${winRate.toFixed(1)}%`,
            gradient: "from-blue-400/80 to-cyrus-accent/80",
            progressWidth: `${winRate}%`,
            delay: "100ms"
          },
          {
            title: "Total Profit/Loss",
            value: formatCurrency(totalProfitLoss),
            valueColor: totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400',
            delay: "200ms"
          },
          {
            title: "Trading Statistics",
            isTable: true,
            rows: [
              { label: "Profitable Trades:", value: profitableTrades },
              { label: "Losing Trades:", value: totalTrades - profitableTrades },
            ],
            delay: "300ms"
          }
        ].map((card, index) => (
          <div 
            key={index} 
            className="cyrus-card hover-lift"
            style={{ 
              animationDelay: card.delay,
              opacity: 0,
              animation: 'fadeIn 0.5s ease forwards'
            }}
          >
            <div className="text-sm text-cyrus-textSecondary">{card.title}</div>
            
            {!card.isTable && (
              <div className={`mt-1 text-2xl font-medium ${card.valueColor || ''}`}>
                {card.value}
              </div>
            )}
            
            {card.gradient && card.progressWidth && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cyrus-border/30">
                <div 
                  className={`h-full bg-gradient-to-r ${card.gradient} transition-all duration-1000`}
                  style={{ width: card.progressWidth }}
                />
              </div>
            )}
            
            {card.isTable && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {card.rows.map((row, idx) => (
                  <>
                    <div key={`label-${idx}`}>{row.label}</div>
                    <div key={`value-${idx}`} className="text-right font-medium">{row.value}</div>
                  </>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div 
        className="cyrus-card overflow-hidden glass-card"
        style={{ 
          animationDelay: "400ms",
          opacity: 0,
          animation: 'fadeIn 0.5s ease forwards'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyrus-border/30">
                <th className="text-left py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Token</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Direction</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Entry Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Exit Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">P/L</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyrus-textSecondary">Exit Time</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.map((trade, index) => (
                <>
                  <tr 
                    key={trade.id} 
                    className="border-b border-cyrus-border/30 hover:bg-cyrus-card/70 cursor-pointer transition-all duration-300"
                    onClick={() => toggleRow(trade.id)}
                    style={{ 
                      animationDelay: `${500 + index * 100}ms`,
                      opacity: 0,
                      animation: 'fadeIn 0.5s ease forwards'
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
                      ${trade.exitPrice.toFixed(4)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(trade.profitLoss)} ({formatPercentage(trade.profitLossPercentage)})
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-cyrus-textSecondary">
                      {formatDate(trade.exitTime)}
                    </td>
                  </tr>
                  {expandedRows[trade.id] && (
                    <tr className="bg-cyrus-background/30">
                      <td colSpan={6} className="px-4 py-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Trade Details</div>
                            <div className="grid grid-cols-2 gap-y-2 p-3 rounded-md bg-cyrus-background/30 border border-cyrus-border/30 text-sm">
                              <div className="text-cyrus-textSecondary">Position Size:</div>
                              <div className="text-right">{trade.amount} {trade.token}</div>
                              <div className="text-cyrus-textSecondary">Entry Time:</div>
                              <div className="text-right">{formatDate(trade.entryTime)}</div>
                              <div className="text-cyrus-textSecondary">Exit Time:</div>
                              <div className="text-right">{formatDate(trade.exitTime)}</div>
                              <div className="text-cyrus-textSecondary">Duration:</div>
                              <div className="text-right">
                                {Math.round((new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / (1000 * 60 * 60))} hours
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium mb-2">Factor Scores</div>
                            <div className="p-3 rounded-md bg-cyrus-background/30 border border-cyrus-border/30">
                              {[
                                { name: "Technical", value: trade.factors.technical, color: "bg-purple-400" },
                                { name: "Fundamental", value: trade.factors.fundamental, color: "bg-blue-400" },
                                { name: "Sentiment", value: trade.factors.sentiment, color: "bg-cyrus-accent/80" }
                              ].map((factor, i) => (
                                <div key={i} className="mb-2 last:mb-0">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>{factor.name}</span>
                                    <span>{factor.value}/100</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-cyrus-border/30">
                                    <div 
                                      className={`h-full ${factor.color} transition-all duration-1000`}
                                      style={{ width: `${factor.value}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
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
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div 
            className="flex justify-center items-center gap-2 pt-4 pb-2"
            style={{ 
              animationDelay: "800ms",
              opacity: 0,
              animation: 'fadeIn 0.5s ease forwards'
            }}
          >
            <button
              onClick={() => setPage(page > 1 ? page - 1 : 1)}
              disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyrus-border/50 bg-transparent text-cyrus-text transition-all duration-300 hover:bg-cyrus-card/60 disabled:opacity-30 disabled:pointer-events-none"
            >
              &lt;
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`h-8 w-8 rounded-md flex items-center justify-center transition-all duration-300 ${
                  pageNum === page
                    ? 'bg-cyrus-accent/80 text-black shadow-sm'
                    : 'bg-cyrus-card/60 text-cyrus-text hover:bg-cyrus-border/50'
                }`}
              >
                {pageNum}
              </button>
            ))}
            
            <button
              onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
              disabled={page === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyrus-border/50 bg-transparent text-cyrus-text transition-all duration-300 hover:bg-cyrus-card/60 disabled:opacity-30 disabled:pointer-events-none"
            >
              &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
