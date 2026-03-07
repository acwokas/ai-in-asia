import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockPrice {
  id: string;
  symbol: string;
  company_name: string;
  current_price: number;
  change_amount: number;
  change_percent: number;
  last_updated: string;
}

const StockTicker = () => {
  const { data: stocks, isLoading } = useQuery({
    queryKey: ['stock-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_prices')
        .select('*')
        .order('symbol', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const THROTTLE_KEY = 'stock_fetch_last_invoked';
        const lastInvoked = parseInt(sessionStorage.getItem(THROTTLE_KEY) || '0', 10);
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        if (lastInvoked < oneHourAgo) {
          sessionStorage.setItem(THROTTLE_KEY, String(Date.now()));
          await supabase.functions.invoke('fetch-stock-data');

          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: newData, error: newError } = await supabase
            .from('stock_prices')
            .select('*')
            .order('symbol', { ascending: true });

          if (newError) throw newError;
          return newData as StockPrice[];
        }

        return [];
      }

      return data as StockPrice[];
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-[#E6F4F1] border-y border-[#D0E8E2] overflow-hidden">
        <div className="container py-2">
          <div className="flex items-center gap-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2 min-w-[200px]">
                <div className="h-4 bg-[#D0E8E2] rounded w-12"></div>
                <div className="h-4 bg-[#D0E8E2] rounded w-16"></div>
                <div className="h-4 bg-[#D0E8E2] rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stocks || stocks.length === 0) {
    return null;
  }

  const displayStocks = [...stocks, ...stocks];

  return (
    <div data-nosnippet aria-hidden="true" className="bg-[#E6F4F1] border-y border-[#D0E8E2] overflow-hidden group">
      <div className="relative">
        <div className="ticker-wrapper">
          <div className="ticker-content">
            {displayStocks.map((stock, index) => (
              <div
                key={`${stock.symbol}-${index}`}
                className="ticker-item inline-flex items-center gap-3 px-6 py-2 whitespace-nowrap"
              >
                <span className="font-semibold text-sm text-[#1a1a1a]">{stock.symbol}</span>
                <span className="text-sm font-medium text-[#1a1a1a]">
                  ${stock.current_price.toFixed(2)}
                </span>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    stock.change_amount >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                  )}
                >
                  {stock.change_amount >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {stock.change_amount >= 0 ? "+" : ""}
                    {stock.change_amount.toFixed(2)} (
                    {stock.change_percent >= 0 ? "+" : ""}
                    {stock.change_percent.toFixed(2)}%)
                  </span>
                </div>
                <span className="text-[#6b7280] text-xs mx-2">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .ticker-wrapper { overflow: hidden; white-space: nowrap; }
        .ticker-content { display: inline-block; animation: scroll 45s linear infinite; }
        .group:hover .ticker-content { animation-play-state: paused; }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .ticker-content { animation-duration: 30s; }
        }
      `}</style>
    </div>
  );
};

export default memo(StockTicker);
