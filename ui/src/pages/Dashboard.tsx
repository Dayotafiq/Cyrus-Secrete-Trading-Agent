
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Pause, TrendingUp, TrendingDown, DollarSign, Wallet, Scale } from 'lucide-react';

// Mock data for charts and metrics
const mockMetrics = {
  sentiment: {
    score: 78,
    change: 5.2,
  },
  fundamental: {
    score: 62,
    whaleActivity: 'High',
    change: -2.8,
  },
  technical: {
    score: 85,
    change: 10.1,
  },
};

const Dashboard = () => {
  const { user, toggleAgentStatus, refreshUserData } = useAuth();

  useEffect(() => {
    refreshUserData();
    // Set up a refresh interval
    const interval = setInterval(() => {
      refreshUserData();
    }, 60000); // Refresh data every minute
    
    return () => clearInterval(interval);
  }, [refreshUserData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Capital Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: "Total Capital",
            value: user?.totalCapital || 0,
            icon: <DollarSign size={18} />,
            color: "text-cyrus-accent",
            bg: "bg-cyrus-accent/10",
            delay: "100ms"
          },
          {
            title: "Bridged Capital",
            value: user?.bridgedCapital || 0,
            icon: <Wallet size={18} />,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            delay: "200ms"
          },
          {
            title: "Active Capital",
            value: user?.activeCapital || 0,
            icon: <Scale size={18} />,
            color: "text-sky-400",
            bg: "bg-sky-500/10",
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
            <div className="flex items-center gap-3">
              <div className={`rounded-full ${card.bg} p-2 ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <div className="text-sm text-cyrus-textSecondary">{card.title}</div>
                <div className="text-xl font-medium">{formatCurrency(card.value)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Agent Status Toggle */}
      <div 
        className="cyrus-card glass-card"
        style={{ 
          animationDelay: "400ms",
          opacity: 0,
          animation: 'fadeIn 0.5s ease forwards'
        }}
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-lg font-medium">Trading Agent Status</h2>
          <p className="mt-1 text-sm text-cyrus-textSecondary">
            {user?.isActive 
              ? "Cyrus AI is actively monitoring and trading on your behalf" 
              : "Cyrus AI is currently paused and not executing trades"}
          </p>
          
          <div className="mt-6">
            <button
              onClick={toggleAgentStatus}
              className={`relative group overflow-hidden rounded-full flex items-center justify-center w-20 h-20 transition-all duration-500 hover-glow ${
                user?.isActive 
                  ? 'bg-cyrus-accent/10 text-cyrus-accent/90 hover:bg-cyrus-danger/10 hover:text-cyrus-danger/90' 
                  : 'bg-cyrus-danger/10 text-cyrus-danger/90 hover:bg-cyrus-accent/10 hover:text-cyrus-accent/90'
              }`}
            >
              <div className="absolute inset-0 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity" 
                style={{ 
                  background: user?.isActive 
                    ? 'radial-gradient(circle, rgba(0,230,118,0.2) 0%, rgba(0,230,118,0) 70%)' 
                    : 'radial-gradient(circle, rgba(255,82,82,0.2) 0%, rgba(255,82,82,0) 70%)' 
                }}
              />
              
              {user?.isActive ? (
                <Pause size={32} className="relative z-10 transition-transform group-hover:scale-110" />
              ) : (
                <Play size={32} className="relative z-10 transition-transform group-hover:scale-110" />
              )}
              
              <span className="absolute inset-0 rounded-full border transition-all duration-700 animate-pulse"
                style={{
                  borderColor: user?.isActive ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 82, 82, 0.3)',
                  borderWidth: '1px'
                }}
              />
            </button>
          </div>
          
          <div className="mt-4 font-medium">
            <span className={`text-lg ${user?.isActive ? 'text-cyrus-accent/90' : 'text-cyrus-danger/90'}`}>
              {user?.isActive ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div style={{ 
        animationDelay: "500ms",
        opacity: 0,
        animation: 'fadeIn 0.5s ease forwards'
      }}>
        <h2 className="text-xl font-medium mb-4">Trading Metrics</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              title: "Sentiment Score",
              score: mockMetrics.sentiment.score,
              change: mockMetrics.sentiment.change,
              gradient: "from-green-400/80 to-cyrus-accent/80",
              delay: "600ms"
            },
            {
              title: "Fundamental Score",
              score: mockMetrics.fundamental.score,
              change: mockMetrics.fundamental.change,
              gradient: "from-blue-400/80 to-cyan-400/80",
              whaleActivity: mockMetrics.fundamental.whaleActivity,
              delay: "700ms"
            },
            {
              title: "Technical Score",
              score: mockMetrics.technical.score,
              change: mockMetrics.technical.change,
              gradient: "from-purple-400/80 to-pink-400/80",
              delay: "800ms"
            }
          ].map((metric, index) => (
            <div 
              key={index} 
              className="cyrus-card hover-lift"
              style={{ 
                animationDelay: metric.delay,
                opacity: 0,
                animation: 'fadeIn 0.5s ease forwards'
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">{metric.title}</h3>
                <div className={`flex items-center ${metric.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {metric.change > 0 ? (
                    <TrendingUp size={14} className="mr-1" />
                  ) : (
                    <TrendingDown size={14} className="mr-1" />
                  )}
                  <span className="text-xs">{Math.abs(metric.change)}%</span>
                </div>
              </div>
              
              <div className="mt-3 flex items-end">
                <div className="text-3xl font-medium">{metric.score}</div>
                <div className="ml-1 text-cyrus-textSecondary text-xs mb-1">/100</div>
              </div>
              
              {metric.whaleActivity && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-cyrus-textSecondary">Whale Activity:</span>
                  <span className={metric.whaleActivity === 'High' ? 'text-cyan-400' : 'text-amber-400'}>
                    {metric.whaleActivity}
                  </span>
                </div>
              )}
              
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cyrus-border/30">
                <div 
                  className={`h-full bg-gradient-to-r ${metric.gradient} transition-all duration-1000`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
