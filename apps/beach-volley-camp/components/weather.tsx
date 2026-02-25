export function airQualityFromPM25(pm25: number) {
  if (pm25 <= 12)
    return {
      label: "Good",
      emoji: "🟢",
      level: "good",
    };

  if (pm25 <= 35.4)
    return {
      label: "Moderate",
      emoji: "🟡",
      level: "moderate",
    };

  if (pm25 <= 55.4)
    return {
      label: "Poor",
      emoji: "🟠",
      level: "poor",
    };

  if (pm25 <= 150.4)
    return {
      label: "Unhealthy",
      emoji: "🔴",
      level: "unhealthy",
    };

  if (pm25 <= 250.4)
    return {
      label: "Very Unhealthy",
      emoji: "🟣",
      level: "very-unhealthy",
    };

  return {
    label: "Hazardous",
    emoji: "🟤",
    level: "hazardous",
  };
}



export function weatherEmoji(code: number) {
    // Open-Meteo weather codes
    if (code === 0) return "☀️";        // clear
    if (code === 1) return "🌤️";        // mostly clear
    if (code === 2) return "⛅";        // partly cloudy
    if (code === 3) return "☁️";        // overcast

    if ([45, 48].includes(code)) return "🌫️"; // fog

    if ([51, 53, 55].includes(code)) return "🌦️"; // drizzle
    if ([61, 63, 65].includes(code)) return "🌧️"; // rain
    if ([66, 67].includes(code)) return "🌧️❄️"; // freezing rain

    if ([71, 73, 75].includes(code)) return "❄️"; // snow
    if (code === 77) return "🌨️";

    if ([80, 81, 82].includes(code)) return "🌧️"; // showers
    if ([95, 96, 99].includes(code)) return "⛈️"; // thunderstorm

    return "🌡️"; // fallback
}


export function temperatureEmoji(temp: number) {
    if (temp >= 30) return "🥵";
    if (temp >= 25) return "☀️";
    if (temp >= 18) return "🌤️";
    if (temp >= 10) return "🌥️";
    return "🥶";
}
