/**
 * dayNight.js — the pure lighting model for the day-night cycle (Phase 2).
 *
 * Maps a normalized time-of-day t ∈ [0,1) (0 = midnight, 0.25 = sunrise, 0.5 = noon,
 * 0.75 = sunset) to everything the Atmosphere needs: sun direction/color/intensity,
 * sky gradient colors, fog, hemisphere/ambient levels, star + night factors. No
 * three.js — returns plain numbers / [r,g,b] arrays / hex; the component applies them.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function lerpRgb(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

// Palette key colors (linear-ish sRGB hex).
const C = {
  skyTopNight: hexToRgb('#05060d'),
  skyTopDay: hexToRgb('#1f4f86'),
  skyHorNight: hexToRgb('#0a0f1c'),
  skyHorDay: hexToRgb('#9fc2e0'),
  twilight: hexToRgb('#e07a3a'),     // warm sunset/sunrise band
  twilightTop: hexToRgb('#3b2a55'),  // purple upper twilight
  sunWarm: hexToRgb('#ff9a4a'),
  sunHigh: hexToRgb('#fff3df'),
  hemiSkyDay: hexToRgb('#bcd4ff'),
  hemiSkyNight: hexToRgb('#243a5e'),
  hemiGroundDay: hexToRgb('#5a4a3a'),
  hemiGroundNight: hexToRgb('#0c0e16'),
};

/**
 * Sample the cycle at time t.
 * @returns {{
 *   sunDir:[x,y,z], sunColor:[r,g,b], sunIntensity:number,
 *   skyTop:[r,g,b], skyHorizon:[r,g,b], fog:[r,g,b],
 *   hemiSky:[r,g,b], hemiGround:[r,g,b], hemiIntensity:number, ambientIntensity:number,
 *   starsOpacity:number, nightFactor:number, dayFactor:number, sunUp:boolean
 * }}
 */
export function sampleDayNight(t) {
  const a = (t - 0.25) * Math.PI * 2;      // sun arc angle
  const sunHeight = Math.sin(a);            // -1..1 (>0 above horizon)
  // Sun direction (unit). Constant south tilt so shadows rake nicely.
  const cx = Math.cos(a), tilt = 0.32;
  let dx = cx, dy = sunHeight, dz = tilt;
  const len = Math.hypot(dx, dy, dz) || 1;
  const sunDir = [dx / len, dy / len, dz / len];

  const dayFactor = smoothstep(-0.05, 0.35, sunHeight);          // overall daylight
  const nightFactor = smoothstep(0.10, -0.18, sunHeight);        // 1 at deep night
  // Twilight peaks when the sun sits near the horizon.
  const twilight = (1 - smoothstep(0.0, 0.28, Math.abs(sunHeight))) * smoothstep(-0.30, 0.02, sunHeight);

  // Sky gradient: night→day, then warm the horizon + purple the top during twilight.
  let skyTop = lerpRgb(C.skyTopNight, C.skyTopDay, dayFactor);
  let skyHorizon = lerpRgb(C.skyHorNight, C.skyHorDay, dayFactor);
  skyTop = lerpRgb(skyTop, C.twilightTop, twilight * 0.6);
  skyHorizon = lerpRgb(skyHorizon, C.twilight, twilight * 0.85);

  const sunColor = lerpRgb(C.sunWarm, C.sunHigh, smoothstep(0.05, 0.5, sunHeight));
  const sunIntensity = clamp(dayFactor, 0, 1) * 2.4;

  const hemiSky = lerpRgb(C.hemiSkyNight, C.hemiSkyDay, dayFactor);
  const hemiGround = lerpRgb(C.hemiGroundNight, C.hemiGroundDay, dayFactor);
  const hemiIntensity = lerp(0.16, 0.6, dayFactor);     // cool moonlight floor at night
  const ambientIntensity = lerp(0.06, 0.22, dayFactor);

  return {
    sunDir,
    sunColor,
    sunIntensity,
    skyTop,
    skyHorizon,
    fog: skyHorizon,
    hemiSky,
    hemiGround,
    hemiIntensity,
    ambientIntensity,
    starsOpacity: clamp(nightFactor * 1.1, 0, 1),
    nightFactor,
    dayFactor,
    twilight,
    sunUp: sunHeight > -0.05,
  };
}

export { clamp, smoothstep, lerp };
