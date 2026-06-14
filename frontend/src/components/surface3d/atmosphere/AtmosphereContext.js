/**
 * AtmosphereContext — a shared mutable ref carrying the current day-night state, so
 * components like PoiStructure can ramp their point lights with nightfall WITHOUT
 * per-frame React re-renders. Atmosphere writes it each frame; consumers read it in
 * their own useFrame.
 */
import { createContext, useContext } from 'react';

export const AtmosphereContext = createContext({ current: { nightFactor: 0, dayFactor: 1, time: 0.5 } });
export const useAtmosphere = () => useContext(AtmosphereContext);
