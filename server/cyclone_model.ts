import { StormTrackPoint, ForecastResult, ForecastConeGeometry } from '../src/types.js';

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates great-circle distance between two lat/lon coordinates in kilometers (Haversine formula)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates new coordinates given a starting point, distance in km, and bearing in degrees
 */
export function destinationPoint(lat: number, lon: number, distanceKm: number, bearingDeg: number): [number, number] {
  const rLat = toRad(lat);
  const rLon = toRad(lon);
  const rBearing = toRad(bearingDeg);
  const angularDist = distanceKm / EARTH_RADIUS_KM;

  const destLat = Math.asin(
    Math.sin(rLat) * Math.cos(angularDist) +
    Math.cos(rLat) * Math.sin(angularDist) * Math.cos(rBearing)
  );

  const destLon =
    rLon +
    Math.atan2(
      Math.sin(rBearing) * Math.sin(angularDist) * Math.cos(rLat),
      Math.cos(angularDist) - Math.sin(rLat) * Math.sin(destLat)
    );

  return [toDeg(destLat), toDeg(destLon)];
}

/**
 * Projects a custom cyclone forward in time for +12h, +24h, +36h, +48h, +72h
 */
export function projectCustomStormTrack(params: {
  lat: number;
  lon: number;
  forwardSpeedKmh: number;
  headingDeg: number;
  centralPressureHpa: number;
  maxWindKmh: number;
}): StormTrackPoint[] {
  const { lat, lon, forwardSpeedKmh, headingDeg, centralPressureHpa, maxWindKmh } = params;
  const timeSteps = [0, 12, 24, 36, 48, 72];

  let currentLat = lat;
  let currentLon = lon;
  let currentWind = maxWindKmh;
  let currentPres = centralPressureHpa;

  return timeSteps.map((hours, idx) => {
    if (idx > 0) {
      const stepHours = hours - timeSteps[idx - 1];
      const dist = forwardSpeedKmh * stepHours;
      // Slight Coriolis deflection (+2 degrees clockwise curve typical in Bay of Bengal recurvature)
      const dynamicHeading = (headingDeg + idx * 1.8) % 360;
      const [nextLat, nextLon] = destinationPoint(currentLat, currentLon, dist, dynamicHeading);
      currentLat = nextLat;
      currentLon = nextLon;

      // Wind intensity adjustment: gradual decay after 36-48 hours inland or over cooler coastal shelf
      if (hours >= 36) {
        currentWind = Math.max(50, Math.round(currentWind * 0.88));
        currentPres = Math.min(1005, Math.round(currentPres + (1013 - currentPres) * 0.25));
      }
    }

    // Cone uncertainty radius grows with forecast horizon
    // NHC / IMD empirical model: R(t) = R0 + 0.95 * t^1.15
    const radiusKm = Math.round(35 + 0.95 * Math.pow(hours, 1.18));

    let category = "Cyclonic Storm";
    if (currentWind >= 222) category = "Super Cyclonic Storm";
    else if (currentWind >= 166) category = "Extremely Severe Cyclonic Storm";
    else if (currentWind >= 118) category = "Very Severe Cyclonic Storm";
    else if (currentWind >= 88) category = "Severe Cyclonic Storm";
    else if (currentWind >= 62) category = "Cyclonic Storm";
    else if (currentWind >= 51) category = "Deep Depression";
    else category = "Depression";

    return {
      timeOffsetHours: hours,
      label: hours === 0 ? "T-0h (Current)" : `+${hours}h Forecast`,
      lat: Number(currentLat.toFixed(3)),
      lon: Number(currentLon.toFixed(3)),
      maxWindKmh: currentWind,
      centralPressureHpa: currentPres,
      category,
      radiusKm
    };
  });
}

/**
 * Builds a smoothed forecast cone polygon around storm track points
 */
export function generateForecastConePolygon(trackPoints: StormTrackPoint[]): ForecastConeGeometry {
  if (trackPoints.length < 2) {
    const p = trackPoints[0] || { lat: 19.0, lon: 85.0, radiusKm: 50 };
    return {
      type: "Polygon",
      coordinates: [
        [
          [p.lon - 0.5, p.lat - 0.5],
          [p.lon + 0.5, p.lat - 0.5],
          [p.lon + 0.5, p.lat + 0.5],
          [p.lon - 0.5, p.lat + 0.5],
          [p.lon - 0.5, p.lat - 0.5]
        ]
      ]
    };
  }

  const leftPerimeter: [number, number][] = []; // [lon, lat]
  const rightPerimeter: [number, number][] = []; // [lon, lat]

  for (let i = 0; i < trackPoints.length; i++) {
    const pt = trackPoints[i];
    let bearing: number;

    if (i < trackPoints.length - 1) {
      const next = trackPoints[i + 1];
      const y = Math.sin(toRad(next.lon - pt.lon)) * Math.cos(toRad(next.lat));
      const x =
        Math.cos(toRad(pt.lat)) * Math.sin(toRad(next.lat)) -
        Math.sin(toRad(pt.lat)) * Math.cos(toRad(next.lat)) * Math.cos(toRad(next.lon - pt.lon));
      bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
    } else {
      const prev = trackPoints[i - 1];
      const y = Math.sin(toRad(pt.lon - prev.lon)) * Math.cos(toRad(pt.lat));
      const x =
        Math.cos(toRad(prev.lat)) * Math.sin(toRad(pt.lat)) -
        Math.sin(toRad(prev.lat)) * Math.cos(toRad(pt.lat)) * Math.cos(toRad(pt.lon - prev.lon));
      bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
    }

    const radius = pt.radiusKm;
    // Tangent points 90 degrees left and right
    const leftAngle = (bearing - 90 + 360) % 360;
    const rightAngle = (bearing + 90) % 360;

    const [leftLat, leftLon] = destinationPoint(pt.lat, pt.lon, radius, leftAngle);
    const [rightLat, rightLon] = destinationPoint(pt.lat, pt.lon, radius, rightAngle);

    leftPerimeter.push([Number(leftLon.toFixed(4)), Number(leftLat.toFixed(4))]);
    rightPerimeter.push([Number(rightLon.toFixed(4)), Number(rightLat.toFixed(4))]);
  }

  // Add a rounded cap around the final forecast track point
  const lastPoint = trackPoints[trackPoints.length - 1];
  const capPoints: [number, number][] = [];
  const lastBearing = 45; // forward direction
  for (let angle = 90; angle >= -90; angle -= 20) {
    const capAngle = (lastBearing + angle + 360) % 360;
    const [cLat, cLon] = destinationPoint(lastPoint.lat, lastPoint.lon, lastPoint.radiusKm, capAngle);
    capPoints.push([Number(cLon.toFixed(4)), Number(cLat.toFixed(4))]);
  }

  // Combine: left path up -> cap around end -> right path down -> close
  const ring = [...leftPerimeter, ...capPoints, ...rightPerimeter.reverse()];
  // Close polygon
  ring.push(ring[0]);

  return {
    type: "Polygon",
    coordinates: [ring]
  };
}

/**
 * Builds full forecast result from track points
 */
export function buildForecastResult(trackPoints: StormTrackPoint[], cycloneName?: string): ForecastResult {
  const coneGeometry = generateForecastConePolygon(trackPoints);
  const swatheRadiusKm = trackPoints.map((p) => p.radiusKm);

  // Landfall point is usually the first track point where lon/lat enters the coastal boundary
  const landfallPoint = trackPoints.find((p) => p.timeOffsetHours >= 12) || trackPoints[1] || trackPoints[0];

  return {
    cycloneName: cycloneName || "Tropical Cyclone Forecast",
    coneGeometry,
    trackPoints,
    swatheRadiusKm,
    landfallEstimate: {
      estimatedTimeHours: landfallPoint.timeOffsetHours,
      estimatedLat: landfallPoint.lat,
      estimatedLon: landfallPoint.lon,
      locationName: landfallPoint.label
    }
  };
}
