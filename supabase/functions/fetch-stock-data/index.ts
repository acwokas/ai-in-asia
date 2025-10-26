import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StockData {
  symbol: string
  company_name: string
  current_price: number
  change_amount: number
  change_percent: number
}

interface FinnhubQuote {
  c: number  // Current price
  d: number  // Change
  dp: number // Percent change
  h: number  // High price of the day
  l: number  // Low price of the day
  o: number  // Open price of the day
  pc: number // Previous close price
  t: number  // Timestamp
}

const STOCK_SYMBOLS = [
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'AMD', name: 'AMD' },
  { symbol: 'INTC', name: 'Intel' },
  { symbol: 'ORCL', name: 'Oracle' },
  { symbol: 'CRM', name: 'Salesforce' },
]

async function fetchStockPrice(symbol: string, apiKey: string): Promise<FinnhubQuote | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    )
    
    if (!response.ok) {
      console.error(`Failed to fetch ${symbol}: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    return data as FinnhubQuote
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY')
    
    if (!FINNHUB_API_KEY) {
      throw new Error('FINNHUB_API_KEY not configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching stock data for AI companies...')

    // Fetch all stock prices with rate limiting (max 60 calls/min on free tier)
    const stockPromises = STOCK_SYMBOLS.map(async ({ symbol, name }, index) => {
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100))
      
      const quote = await fetchStockPrice(symbol, FINNHUB_API_KEY)
      
      if (!quote || quote.c === 0) {
        console.warn(`No data for ${symbol}`)
        return null
      }

      return {
        symbol,
        company_name: name,
        current_price: quote.c,
        change_amount: quote.d,
        change_percent: quote.dp,
      }
    })

    const results = await Promise.all(stockPromises)
    const validStocks = results.filter((stock): stock is StockData => stock !== null)

    console.log(`Successfully fetched ${validStocks.length} stock prices`)

    // Update database with latest prices
    for (const stock of validStocks) {
      const { error } = await supabase
        .from('stock_prices')
        .upsert({
          symbol: stock.symbol,
          company_name: stock.company_name,
          current_price: stock.current_price,
          change_amount: stock.change_amount,
          change_percent: stock.change_percent,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'symbol',
        })

      if (error) {
        console.error(`Error updating ${stock.symbol}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stocks: validStocks,
        updated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Stock fetch error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
