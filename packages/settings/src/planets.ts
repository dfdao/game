import * as decoders from 'decoders';

const decodeAdminPlanet = decoders.exact({
  x: decoders.number,
  y: decoders.number,
  level: decoders.number,
  planetType: decoders.number,
  requireValidLocationId: decoders.boolean,
  revealLocation: decoders.boolean,
});

const decodeAdminArenaPlanet = decoders.exact({
  location: decoders.string,
  x: decoders.number,
  y: decoders.number,
  perlin: decoders.number,
  level: decoders.number,
  planetType: decoders.number,
  requireValidLocationId: decoders.boolean,
  isTargetPlanet: decoders.boolean,
  isSpawnPlanet: decoders.boolean,
  blockedPlanetIds: decoders.array(decoders.string),
});

export type AdminPlanets = ReturnType<typeof decodeAdminPlanets>;
export type AdminArenaPlanet = ReturnType<typeof decodeAdminArenaPlanet>;

export const decodeAdminPlanets = decoders.guard(decoders.array(decodeAdminPlanet), {
  style: 'simple',
});

export const decodeArenaAdminPlanets = decoders.guard(decoders.array(decodeAdminArenaPlanet), {
  style: 'simple',
});
