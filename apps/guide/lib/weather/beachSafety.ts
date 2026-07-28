export type BeachSafetyLevel = "low" | "medium" | "high" | "closed";
export type BeachFlagEquivalent = "red_yellow" | "yellow" | "red" | "double_red";

export type BeachSafetyInput = {
  windKph?: number | null;
  windGustKph?: number | null;
  waveHeightM?: number | null;
  precipitationMm?: number | null;
  weatherCode?: number | null;
};

export type BeachSafetyAssessment = {
  advisory_level: BeachSafetyLevel;
  flag_equivalent: BeachFlagEquivalent;
  reasons: string[];
  metrics: {
    wind_kph: number | null;
    wind_gust_kph: number | null;
    wave_height_m: number | null;
    precipitation_mm: number | null;
    weather_code: number | null;
    beaufort: number | null;
  };
  standards: {
    flag_system: string;
    wind_scale: string;
  };
};

const KPH_BY_BEAUFORT_MAX = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117] as const;

function finiteOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function beaufortFromKph(kph: number | null) {
  if (kph == null) return null;
  for (let force = 0; force < KPH_BY_BEAUFORT_MAX.length; force += 1) {
    if (kph <= KPH_BY_BEAUFORT_MAX[force]) return force;
  }
  return 12;
}

export function evaluateBeachSafety(input: BeachSafetyInput): BeachSafetyAssessment {
  const windKph = finiteOrNull(input.windKph);
  const windGustKph = finiteOrNull(input.windGustKph);
  const waveHeightM = finiteOrNull(input.waveHeightM);
  const precipitationMm = finiteOrNull(input.precipitationMm);
  const weatherCode = finiteOrNull(input.weatherCode);
  const beaufort = beaufortFromKph(windKph);

  const reasons: string[] = [];
  let level: BeachSafetyLevel = "low";
  let flag: BeachFlagEquivalent = "red_yellow";

  const closureByWind = (windKph ?? 0) >= 50 || (windGustKph ?? 0) >= 62;
  const closureBySea = (waveHeightM ?? 0) >= 2.5;
  if (closureByWind || closureBySea) {
    level = "closed";
    flag = "double_red";
    if (closureByWind) reasons.push("Very strong wind/gusts (around Beaufort 7+).");
    if (closureBySea) reasons.push("Very rough sea state (wave height >= 2.5m).");
  } else {
    const highByWind = (windKph ?? 0) >= 39 || (windGustKph ?? 0) >= 50;
    const highBySea = (waveHeightM ?? 0) >= 2;
    const highByStormCode = weatherCode != null && weatherCode >= 95;
    if (highByWind || highBySea || highByStormCode) {
      level = "high";
      flag = "red";
      if (highByWind) reasons.push("Strong wind profile (around Beaufort 6+).");
      if (highBySea) reasons.push("Rough sea state (wave height >= 2.0m).");
      if (highByStormCode) reasons.push("Thunderstorm conditions present.");
    } else {
      const mediumByWind = (windKph ?? 0) >= 20 || (windGustKph ?? 0) >= 35;
      const mediumBySea = (waveHeightM ?? 0) >= 1.2;
      const mediumByRain = (precipitationMm ?? 0) >= 2;
      if (mediumByWind || mediumBySea || mediumByRain) {
        level = "medium";
        flag = "yellow";
        if (mediumByWind) reasons.push("Moderate wind (around Beaufort 4-5).");
        if (mediumBySea) reasons.push("Moderate sea state (wave height >= 1.2m).");
        if (mediumByRain) reasons.push("Rain may reduce visibility and comfort.");
      } else {
        reasons.push("Low wind and low wave conditions.");
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push("Limited data: apply local lifeguard signs and operator guidance.");
  }

  return {
    advisory_level: level,
    flag_equivalent: flag,
    reasons,
    metrics: {
      wind_kph: windKph,
      wind_gust_kph: windGustKph,
      wave_height_m: waveHeightM,
      precipitation_mm: precipitationMm,
      weather_code: weatherCode,
      beaufort,
    },
    standards: {
      flag_system: "ILS/ISO 20712 flag semantics (hazard translation)",
      wind_scale: "WMO Beaufort scale (wind-band mapping)",
    },
  };
}
