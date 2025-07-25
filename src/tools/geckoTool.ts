import { tool } from '@langchain/core/tools';
import dotenv from 'dotenv';
import { traceable } from 'langsmith/traceable';
import fetch from 'node-fetch';
import { z } from 'zod';
import {
  CoinMarketData,
  CoinPrice
} from './types';



// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Build CoinGecko API URL with proper base URL based on API key availability
 */
const buildCoinGeckoUrl = (endpoint: string, apiKey?: string): string => {
  const baseUrl = 'https://api.coingecko.com/api/v3';
  return `${baseUrl}${endpoint}`;
};

/**
 * Build headers for CoinGecko API requests
 */
const buildHeaders = (apiKey?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'LangChain-CoinGecko-Tool/2.0.0'
  };

  // Do not send API key for free tier to avoid conflicts
  // if (apiKey) {
  //   headers['x-cg-pro-api-key'] = apiKey;
  // }

  return headers;
};

/**
 * Format large numbers with appropriate suffixes
 */
const formatNumber = (num: number): string => {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
};

/**
 * Format price with appropriate decimal places
 */
const formatPrice = (price: number): string => {
  if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
};




// =============================================================================
// COINGECKO TOOLS
// =============================================================================

// Tool 1: Get cryptocurrency prices
const tracedCoinGeckoPriceTool = traceable(
  async ({ coinIds, vsCurrencies, includeMarketCap, includeVolume, includePriceChange }: {
    coinIds: string;
    vsCurrencies?: string;
    includeMarketCap?: boolean;
    includeVolume?: boolean;
    includePriceChange?: boolean;
  }) => {
    const apiKey = process.env.COINGECKO_API_KEY;
    const currencies = vsCurrencies || 'usd';

    const params = new URLSearchParams({
      ids: coinIds,
      vs_currencies: currencies,
      include_market_cap: (includeMarketCap ?? true).toString(),
      include_24hr_vol: (includeVolume ?? true).toString(),
      include_24hr_change: (includePriceChange ?? true).toString(),
      include_last_updated_at: 'true'
    });

    const url = buildCoinGeckoUrl(`/simple/price?${params.toString()}`, apiKey);
    const headers = buildHeaders(apiKey);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`CoinGecko API Error: ${response.status} ${response.statusText}`, errorBody);
      if (response.status === 404) {
        return `❌ Sorry, I couldn't find price data for "${coinIds}". Please check the coin ID and try again.\n\n💡 Common coin IDs: bitcoin, ethereum, solana, cardano, polkadot, chainlink, avalanche-2, polygon, etc.`;
      }
      throw new Error(`CoinGecko API error! status: ${response.status}`);
    }

    const data = await response.json() as CoinPrice;

    // Format the response
    let result = `💰 **Cryptocurrency Prices**\n\n`;

    Object.entries(data).forEach(([coinId, priceData]) => {
      result += `🪙 **${coinId.replace(/-/g, ' ').toUpperCase()}**\n`;

      // Get base currency prices (keys without underscores)
      Object.entries(priceData).forEach(([key, value]) => {
        if (!key.includes('_') && typeof value === 'number') {
          result += `   💵 Price (${key.toUpperCase()}): ${formatPrice(value)}\n`;
        }
      });

      // Add market cap if available
      const marketCapKey = Object.keys(priceData).find(k => k.includes('market_cap'));
      if (marketCapKey && priceData[marketCapKey]) {
        result += `   📊 Market Cap: ${formatNumber(priceData[marketCapKey])}\n`;
      }

      // Add volume if available
      const volumeKey = Object.keys(priceData).find(k => k.includes('24h_vol'));
      if (volumeKey && priceData[volumeKey]) {
        result += `   📈 24h Volume: ${formatNumber(priceData[volumeKey])}\n`;
      }

      // Add price change if available
      const changeKey = Object.keys(priceData).find(k => k.includes('24h_change'));
      if (changeKey && priceData[changeKey]) {
        const change = priceData[changeKey];
        const changeEmoji = change >= 0 ? '📈' : '📉';
        const changePrefix = change >= 0 ? '+' : '';
        result += `   ${changeEmoji} 24h Change: ${changePrefix}${change.toFixed(2)}%\n`;
      }

      result += '\n';
    });

    return result;
  },
  {
    run_type: "tool",
    name: "coingecko-price",
  }
);



export const coinGeckoPriceTool = tool(tracedCoinGeckoPriceTool, {
  name: "coinGeckoPrice",
  description: "Get current cryptocurrency prices from CoinGecko. Use coin IDs like 'bitcoin', 'ethereum', 'solana', etc.",
  schema: z.object({
    coinIds: z.string().describe("Comma-separated list of coin IDs (e.g., 'bitcoin,ethereum,solana')"),
    vsCurrencies: z.string().optional().describe("Comma-separated list of currencies (default: 'usd')"),
    includeMarketCap: z.boolean().optional().describe("Include market cap data (default: true)"),
    includeVolume: z.boolean().optional().describe("Include 24h volume data (default: true)"),
    includePriceChange: z.boolean().optional().describe("Include 24h price change data (default: true)"),
  }),
});

// Tool 2 : Get market data for top crypto-currencies
const tracedCoinGeckoMarketTool = traceable(
  async ({ vsCurrency , perPage, page, category }: {
    vsCurrency? : string;
    perPage?: number;
    page?: number;
    category?: string;
  }) => {
    const apiKey = process.env.COINGECKO_API_KEY;
    const currency = vsCurrency || 'usd';
    const limit = Math.min(perPage || 10, 250 );
    const pageNum = page || 1 ;



     const params = new URLSearchParams({
    vs_currency: currency,
    order : 'market_cap_desc',
    per_page: limit.toString() ,
    sparkline : 'false',
    locale : 'eng'
  });
 if (category ) {
  params.append('category' , category );
 }

const url = buildCoinGeckoUrl(`/coins/markets?${params.toString()}`, apiKey);
const headers = buildHeaders(apiKey);

const response = await fetch(url, { headers });

if (!response.ok) {
  throw new Error(`coinGecko API error ! status: ${response.status}`);

}

const data = await response.json() as CoinMarketData[];

    let result = `📊 **Top ${limit} Cryptocurrencies by Market Cap**\n`;
    if (category) result += `🏷️ Category: ${category}\n`;
    result += `💱 Currency: ${currency.toUpperCase()}\n\n`;

    data.forEach((coin) => {
      const priceChange = coin.price_change_percentage_24h;
      const changeEmoji = priceChange >= 0 ? '📈' : '📉';
      const changePrefix = priceChange >= 0 ? '+' : '';

      result += `**${coin.market_cap_rank}. ${coin.name} (${coin.symbol.toUpperCase()})**\n`;
      result += `   💰 $${formatPrice(coin.current_price)}\n`;
      result += `   📊 Market Cap: $${formatNumber(coin.market_cap)}\n`;
      result += `   📈 24h Volume: $${formatNumber(coin.total_volume)}\n`;
      result += `   ${changeEmoji} 24h: ${changePrefix}${priceChange.toFixed(2)}%\n`;
      if (coin.circulating_supply) {
        result += `   🔄 Circulating: ${formatNumber(coin.circulating_supply)} ${coin.symbol.toUpperCase()}\n`;
      }
      result += '\n';
    });

    return result;


}
);
export const coinGeckoMarketTool = tool (tracedCoinGeckoMarketTool, {
  name: "coinGeckoMarket" ,
  description : "Get market data for top crypto-currencies by market cap from coinGecko" ,
  schema : z.object({
    vsCurrency: z.string().optional().describe("The target currency (default : 'usd')"),
    perPage: z.number().optional().describe("Number of results per page (max 250, default: 10)"),
    page : z.number().optional().describe("Page number  (default : 1)" ) ,
    category: z.string().optional().describe("Filter by category ( e.g , NFT , Defi, gaming') "),
  }),
});

















export const ALL_GECKO_TOOLS = [
  coinGeckoPriceTool,
];
