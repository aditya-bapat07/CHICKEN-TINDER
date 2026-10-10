import { useState, useEffect } from "react";
import { Icon } from "./UI";

export interface WeatherState {
  enabled: boolean;
  type: "sunny" | "rainy" | "cold" | "night" | "mild";
  tempC: number;
  description: string;
}

interface WeatherVibeProps {
  onWeatherChange: (state: WeatherState) => void;
  activeWeather: WeatherState;
}

export function WeatherVibe({
  onWeatherChange,
  activeWeather,
}: WeatherVibeProps) {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const fetchLiveWeather = async () => {
    setLoading(true);
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation unavailable");
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
            );
            const data = await res.json();
            const current = data.current_weather;
            const code = current.weathercode;
            const temp = Math.round(current.temperature);
            const isNight = current.is_day === 0;

            let type: WeatherState["type"] = "mild";
            let desc = "Mild Weather";

            if (isNight) {
              type = "night";
              desc = `Stargazing Night • ${temp}°C`;
            } else if (
              [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code)
            ) {
              type = "rainy";
              desc = `Cozy Rain • ${temp}°C`;
            } else if (temp < 8) {
              type = "cold";
              desc = `Chilly Day • ${temp}°C`;
            } else if ([0, 1].includes(code) && temp >= 18) {
              type = "sunny";
              desc = `Sunny & Bright • ${temp}°C`;
            } else {
              desc = `Fresh Air • ${temp}°C`;
            }

            onWeatherChange({
              enabled: true,
              type,
              tempC: temp,
              description: desc,
            });
          } catch {
            // Fallback to sunny
            onWeatherChange({
              enabled: true,
              type: "sunny",
              tempC: 22,
              description: "Sunny afternoon • 22°C",
            });
          } finally {
            setLoading(false);
          }
        },
        () => {
          // Denied or error - set friendly default
          onWeatherChange({
            enabled: true,
            type: "sunny",
            tempC: 21,
            description: "Sunny afternoon • 21°C",
          });
          setLoading(false);
        },
        { timeout: 5000 },
      );
    } catch {
      setLoading(false);
    }
  };

  const setPreset = (
    type: WeatherState["type"],
    desc: string,
    temp: number,
  ) => {
    onWeatherChange({
      enabled: true,
      type,
      tempC: temp,
      description: desc,
    });
    setShowOptions(false);
  };

  return (
    <div className="weather-vibe-bar">
      <button
        type="button"
        className={`weather-toggle-btn ${activeWeather.enabled ? "active" : ""}`}
        onClick={() => {
          if (!activeWeather.enabled) {
            void fetchLiveWeather();
          } else {
            onWeatherChange({ ...activeWeather, enabled: false });
          }
        }}
        title="Filter activities based on real weather"
      >
        <Icon
          name={
            activeWeather.type === "night"
              ? "moon"
              : activeWeather.type === "rainy"
                ? "cloud"
                : "sun"
          }
          size={16}
        />
        <span>
          {loading
            ? "Checking forecast…"
            : activeWeather.enabled
              ? activeWeather.description
              : "Weather Vibes"}
        </span>
      </button>

      {activeWeather.enabled && (
        <button
          type="button"
          className="icon-button small weather-opt-btn"
          onClick={() => setShowOptions(!showOptions)}
          title="Change weather mode"
        >
          <Icon name="settings" size={14} />
        </button>
      )}

      {showOptions && (
        <div className="weather-dropdown">
          <button
            type="button"
            onClick={() => setPreset("sunny", "Sunny Outdoors • 24°C", 24)}
          >
            ☀️ Sunny & Outdoors
          </button>
          <button
            type="button"
            onClick={() => setPreset("rainy", "Rainy Indoor Cozy • 14°C", 14)}
          >
            🌧️ Rainy & Indoor Cozy
          </button>
          <button
            type="button"
            onClick={() => setPreset("cold", "Chilly Winter Vibe • 5°C", 5)}
          >
            ❄️ Chilly / Warm Drinks
          </button>
          <button
            type="button"
            onClick={() => setPreset("night", "Late Night Stargazing", 18)}
          >
            🌙 Late Night / Ambient
          </button>
          <button type="button" onClick={() => void fetchLiveWeather()}>
            📍 Auto-Detect My Location
          </button>
        </div>
      )}
    </div>
  );
}

export default WeatherVibe;
