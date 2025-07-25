import { tool } from '@langchain/core/tools';

import { coinGeckoMarketTool, coinGeckoPriceTool } from './geckoTool';
import { openWeatherMapTool } from './weatherTool';

import { traceable } from 'langsmith/traceable';
import { z } from 'zod';



/*
// Define Brave search tool
const braveApiKey  = process.env.BRAVE_SEARCH_API_KEY ;
if (!braveApiKey) {


  throw new Error("BRAVE_SEARCH_API_KEY is not defined. Please set it in your environment variables.");
}

const braveSearch = new BraveSearch({
  apiKey: braveApiKey,
});

// 2. Création d'une fonction tracée qui appelle braveSearch.invoke()
const tracedBraveSearchTool = traceable(
  async ({ query }: { query: string }) => {
    return await braveSearch.invoke({ query });
  },
  {
    run_type: "tool",
    name: "brave-search",
  }
);

// 🛠️ 4. Expose la fonction comme un tool LangChain si souhaité
const braveSearchTool = tool(tracedBraveSearchTool, {
  name: "braveSearch",
  description: "Recherche web via Brave Search (privacy-focused search engine)",
  schema: z.object({
    query: z.string().describe("Texte de recherche"),
  }),
});








/*
// Define the Tavily search tool
const apiKey = process.env.TAVILY_API_KEY;

if (!apiKey) {
  throw new Error("TAVILY_API_KEY is not defined. Please set it in your environment variables.");
}

const tavily = new TavilySearch({
  tavilyApiKey: apiKey,
  maxResults: Math.max(1, Math.min(10, 3)), // Ensure maxResults is within a reasonable range
});





// 2. Création d’une fonction tracée qui appelle tavily.invoke()
const tracedTavilytool = traceable(
  async ({ query }: { query: string }) => {
    return await tavily.invoke({ query});
  },
  {
    run_type: "tool",
    name: "tavily-search",
  }
);


// 🛠️ 4. Expose la fonction comme un tool LangChain si souhaité
const tavilyTool = tool(tracedTavilytool, {
  name: "tavilySearch",
  description: "Recherche web via Tavily",
  schema: z.object({
    query: z.string().describe("Texte de recherche"),
  }),
});

*/

// Define the traced function for the addition tool
const tracedAdditionTool = traceable(
  async({ a, b }: { a: number; b: number }) => {
  return (a + b).toString();
},

{
  run_type: "tool",
  name : "additionTool"
}
);

const additionTool = tool(tracedAdditionTool, {
  name: "additionTool",
  description: "Adds two numbers together.",
  schema: z.object({
    a: z.number().describe("The first number to add."),
    b: z.number().describe("The second number to add."),
  }),
});


// Define the traced function for the random number generator tool
const tracedRandomNumberTool = traceable(
    async ({ min, max }: { min: number; max: number }) => {
      if (min > max) {
        throw new Error("Invalid range: min must be less than or equal to max.");
      }
      const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
      return randomNumber.toString();
    },
    {
      run_type: "tool",
      name: "randomNumberTool"
    }
);
const randomNumberTool = tool(tracedRandomNumberTool, {
  name: "randomNumberTool",
  description: "Generates a random number between the specified min and max values.",
  schema: z.object({
    min: z.number().describe("The minimum value (inclusive)."),
    max: z.number().describe("The maximum value (inclusive)."),
  }),
});




// Define the traced function for the current time tool
const tracedCurrentTimeTool = traceable(
async () => {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
},
{
  run_type: "tool",
  name: "currentTime"
}
);

const currentTimeTool  = tool(tracedCurrentTimeTool, {
  name: "currentTime",
  description: "Returns the current local time in HH:MM:SS format.",
  schema: z.object({}),

});













export const ALL_TOOLS_LIST = [
  openWeatherMapTool,
  coinGeckoPriceTool,
  coinGeckoMarketTool,
  additionTool,
  randomNumberTool,
  currentTimeTool
]
