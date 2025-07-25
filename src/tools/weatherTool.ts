import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { ForecastItem, ForecastResponse } from './types';


export const openWeatherMapTool = tool(
  async ({ city, country, days }: { city: string; country?: string; days?: number }) => {
    let apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      throw new Error("OPENWEATHERMAP_API_KEY is not set");
    }
    // Clean the API key from potential extra characters from .env file
    apiKey = apiKey.replace(/["';]/g, '').trim();

    const location = country ? `${city},${country}` : city;
    const forecastDays = Math.max(1, Math.min(days ?? 3, 5)); // Clamp between 1-5 days

    const intervals = Math.min(forecastDays * 8, 40);
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&cnt=${intervals}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return `❌ Sorry, I couldn't find weather data for ${city}${country ? `, ${country}` : ''}. Please check the city name and try again.`;
      }
      if (response.status === 401) {
        return `🔑 API key error. Please check your OpenWeatherMap API key.`;
      }
      throw new Error(`OpenWeatherMap API error! status: ${response.status}`);
    }

    console.log("Parsing weather data...");
    const data = await response.json() as ForecastResponse;

    if (!data.list || data.list.length === 0) {
      console.log("No data.list found in API response.");
      return `❌ No weather data available for ${city}.`;
    }
    console.log(`Found ${data.list.length} forecast intervals.`);

    // Group forecast by date with proper typing and safety checks
    const forecastByDay: Record<string, { temps: number[], descriptions: string[], minTemp: number, maxTemp: number }> = {};

    data.list.forEach((item: ForecastItem, index: number) => {
      // console.log(`Processing item ${index}...`);
      const date = item.dt_txt.split(' ')[0];
      if (!forecastByDay[date]) {
        // console.log(`Creating new entry for date: ${date}`);
        forecastByDay[date] = {
          temps: [],
          descriptions: [],
          minTemp: item.main.temp_min,
          maxTemp: item.main.temp_max
        };
      }

      forecastByDay[date].temps.push(item.main.temp);

      // Safety check for weather array
      if (item.weather && item.weather.length > 0) {
        forecastByDay[date].descriptions.push(item.weather[0].description);
      }

      // Track min/max temperatures
      forecastByDay[date].minTemp = Math.min(forecastByDay[date].minTemp, item.main.temp_min);
      forecastByDay[date].maxTemp = Math.max(forecastByDay[date].maxTemp, item.main.temp_max);
    });

    console.log("Finished grouping data by day. Forecast object:", forecastByDay);

    // Sort dates chronologically and slice
    const dates = Object.keys(forecastByDay)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .slice(0, forecastDays);

    console.log(`Processing forecast for dates: ${dates.join(', ')}`);

    const forecastList = dates.map(date => {
      const dayData = forecastByDay[date];

      // Safety check for empty arrays
      if (dayData.temps.length === 0) {
        return `📅 ${date} — ❌ No data available`;
      }

      const avgTemp = Math.round(dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length);
      const minTemp = Math.round(dayData.minTemp);
      const maxTemp = Math.round(dayData.maxTemp);
      const desc = dayData.descriptions[0] || 'No description';

      return `📅 ${date} — 🌡️ ${avgTemp}°C (${minTemp}°C-${maxTemp}°C), 🌥️ ${desc}`;
    });

    console.log("Successfully formatted forecast list.");
    const locationName = data.city ? `${data.city.name}, ${data.city.country}` : location;
    return `🌤️ Weather forecast for ${locationName} (next ${forecastDays} days):\n${forecastList.join('\n')}`;
  },
  {
    name: "openWeatherMap",
    description: "Retrieves weather forecasts for a given city with temperature ranges and conditions.",
    schema: z.object({
      city: z.string().describe("The name of the city to get the weather for."),
      country: z.string().optional().describe("The country code of the city (optional)."),
      days: z.number().min(1).max(5).optional().describe("Number of days for the forecast (1-5 days, default is 3)."),
    }),
  }
);
