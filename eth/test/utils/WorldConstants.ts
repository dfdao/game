import { decodeInitializers } from '@dfdao/settings';
import { TestLocation } from './TestLocation';

const defaultInitializerValues = {
  START_PAUSED: false,
  ADMIN_CAN_ADD_PLANETS: true,
  TOKEN_MINT_END_TIMESTAMP: '3031-05-27T18:59:59.000Z',
  WORLD_RADIUS_LOCKED: true,
  WORLD_RADIUS_MIN: 304514,
  DISABLE_ZK_CHECKS: true,
  PLANETHASH_KEY: 1,
  SPACETYPE_KEY: 2,
  BIOMEBASE_KEY: 3,
  PERLIN_MIRROR_X: false,
  PERLIN_MIRROR_Y: false,
  PERLIN_LENGTH_SCALE: 8192,
  MAX_NATURAL_PLANET_LEVEL: 9,
  TIME_FACTOR_HUNDREDTHS: 100,
  PERLIN_THRESHOLD_1: 13,
  PERLIN_THRESHOLD_2: 15,
  PERLIN_THRESHOLD_3: 18,
  INIT_PERLIN_MIN: 12,
  INIT_PERLIN_MAX: 13,
  BIOME_THRESHOLD_1: 15,
  BIOME_THRESHOLD_2: 17,
  PLANET_LEVEL_THRESHOLDS: [16777216, 4194292, 1048561, 262128, 65520, 16368, 4080, 1008, 240, 48],
  PLANET_RARITY: 16384,
  PLANET_TRANSFER_ENABLED: true,
  PHOTOID_ACTIVATION_DELAY: 60 * 60 * 12, // 12 hours
  SPAWN_RIM_AREA: 7234560000,
  LOCATION_REVEAL_COOLDOWN: 60 * 60 * 24,
  PLANET_TYPE_WEIGHTS: [
    [
      [1, 0, 0, 0, 0],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
      [13, 2, 0, 0, 1],
    ],
    [
      [1, 0, 0, 0, 0],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
      [12, 2, 1, 0, 1],
    ],
    [
      [1, 0, 0, 0, 0],
      [10, 4, 1, 0, 1],
      [10, 4, 1, 0, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
    ],
    [
      [1, 0, 0, 0, 0],
      [10, 4, 1, 0, 1],
      [10, 4, 1, 0, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
      [8, 4, 1, 2, 1],
    ],
  ],
  SILVER_SCORE_VALUE: 100,
  ARTIFACT_POINT_VALUES: [0, 2000, 10000, 200000, 3000000, 20000000],
  SPACE_JUNK_ENABLED: true,
  SPACE_JUNK_LIMIT: 1000,
  PLANET_LEVEL_JUNK: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65],
  ABANDON_SPEED_CHANGE_PERCENT: 150,
  ABANDON_RANGE_CHANGE_PERCENT: 150,
  CAPTURE_ZONES_ENABLED: true,
  CAPTURE_ZONE_CHANGE_BLOCK_INTERVAL: 255,
  CAPTURE_ZONE_RADIUS: 500,
  CAPTURE_ZONE_PLANET_LEVEL_SCORE: [
    20_000, 25_000, 30_000, 35_000, 40_000, 45_000, 50_000, 55_000, 60_000, 65_000,
  ],
  CAPTURE_ZONE_HOLD_BLOCKS_REQUIRED: 16,
  CAPTURE_ZONES_PER_5000_WORLD_RADIUS: 1,
  SPACESHIPS: {
    GEAR: true,
    MOTHERSHIP: true,
    CRESCENT: true,
    TITAN: true,
    WHALE: true,
  },
  ROUND_END_REWARDS_BY_RANK: [
    5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  TARGETS_REQUIRED_FOR_VICTORY: 0,
  CLAIM_VICTORY_ENERGY_PERCENT: 50,
  MANUAL_SPAWN: false,
};

// This builds a fake HRE-like object used to initialize the test contracts
export const initializers = decodeInitializers(defaultInitializerValues);

// This builds a fake HRE-like object used to initialize the test contracts
export const noPlanetTransferInitializers = decodeInitializers({
  ...defaultInitializerValues,
  PLANET_TRANSFER_ENABLED: false,
});

// This builds a fake HRE-like object used to initialize the test contracts
export const target4Initializers = decodeInitializers({
  ...defaultInitializerValues,
  WORLD_RADIUS_LOCKED: false,
  WORLD_RADIUS_MIN: 1,
});

// This builds a fake HRE-like object used to initialize the test contracts
export const arenaInitializers = decodeInitializers({
  ...defaultInitializerValues,
  MANUAL_SPAWN: true,
  ADMIN_CAN_ADD_PLANETS: true,
  INIT_PERLIN_MIN: 1,
  INIT_PERLIN_MAX: 31,
});

export const VALID_INIT_PERLIN = initializers.INIT_PERLIN_MIN;
export const NEBULA_PERLIN = initializers.PERLIN_THRESHOLD_1 - 1;
export const SPACE_PERLIN = initializers.PERLIN_THRESHOLD_1;
export const DEEP_SPACE_PERLIN = initializers.PERLIN_THRESHOLD_2;
export const DEAD_SPACE_PERLIN = initializers.PERLIN_THRESHOLD_3;

export const INVALID_TOO_CLOSE_SPAWN = initializers.WORLD_RADIUS_MIN - 100000;
export const INVALID_TOO_FAR_SPAWN = initializers.WORLD_RADIUS_MIN + 100000;

export const SPAWN_PLANET_1 = new TestLocation({
  // no asteroids
  // lvl0
  hex: '000005b379a628bbff76773da66355dc814f5c184bc033e87e011c876418b165',
  perlin: VALID_INIT_PERLIN,
  distFromOrigin: 1998,
});

export const SPAWN_PLANET_2 = new TestLocation({
  // no asteroids
  // lvl0
  hex: '000039be54a58abcff9ef3571afa3f7f2671004d1198fa276b0f9cb54ac9257d',
  perlin: VALID_INIT_PERLIN,
  distFromOrigin: 1998,
});

export const LVL0_PLANET_POPCAP_BOOSTED = new TestLocation({
  // byte #9 is < 16; popcap doubled
  // lvl0
  hex: '000039be54a58abcff0ef3571afa3f7f2671004d1198fa276b0f9cb54ac9257d',
  perlin: VALID_INIT_PERLIN,
  distFromOrigin: 0,
});

export const LVL0_PLANET = new TestLocation({
  // no asteroids
  // lvl0
  hex: '000005b379a628bbff76773da66355dc814f5c184bc033e87e011c876418b166',
  perlin: VALID_INIT_PERLIN,
  distFromOrigin: 1998,
});

export const LVL0_PLANET_DEEP_SPACE = new TestLocation({
  // no asteroids, lvl 0
  hex: '000005b379a628bbff76773da66355dc814f5c184bc033e87e011c876418b177',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL0_PLANET_DEAD_SPACE = new TestLocation({
  // no asteroids, lvl 0
  hex: '000005b379a628bbff76773da66355dc814f5c184bc033e87e011c876418b178',
  perlin: DEAD_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL0_PLANET_OUT_OF_BOUNDS = new TestLocation({
  // no comets, lvl 0, out of bounds
  hex: '000005b379a628bbff76773da66355dc814f5c184bc033e87e011c876418b169',
  perlin: VALID_INIT_PERLIN,
  distFromOrigin: 999999999,
});

export const LVL1_PLANET_NEBULA = new TestLocation({
  // no special props
  // lvl1, nebula
  hex: '000057c13def522bffa2fee2eeb9ce2cc04b5f5176538cbfe524d8f6b00a827d',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_PLANET_SPACE = new TestLocation({
  // no special props
  // lvl1, space
  hex: '000057c13def522bffa2fee2eeb9ce2cc04b5f5176538cbfe524d8f6b00a827e',
  perlin: SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_PLANET_DEEP_SPACE = new TestLocation({
  // no special props
  // lvl1, deepspace
  hex: '000057c13def522bffa2fee2eeb9ce2cc04b5f5176538cbfe524d8f6b00a827f',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL2_PLANET_SPACE = new TestLocation({
  // no special props. it's in space
  // lvl2, space
  hex: '000057c10def522bffa2fee2eeb9ce2cc04b5f5176538cbfe524d8f6b00a8280',
  perlin: SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL2_PLANET_DEEP_SPACE = new TestLocation({
  // no special props. it's in deepspace
  // lvl2, deepspace
  hex: '000057c10def522bffa2fee2eeb9ce2cc04b5f5176538cbfe524d8f6b00a8281',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL2_PLANET_DEAD_SPACE = new TestLocation({
  // no special props. it's in deepspace
  // lvl2, dead space
  hex: '000057c10def522bffa2fee2eeb9ce2cc04b5f5176538cbfe524d8f6b00a8282',
  perlin: DEAD_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_ASTEROID_1 = new TestLocation({
  // byte #8 is 22; produces silver in space
  // lvl1, space
  hex: '000081841ff6c628226b1548838bafd047818ef3e4f76916db6f726c2eebf923',
  perlin: SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_ASTEROID_2 = new TestLocation({
  // byte #8 is 22; produces silver in space
  // lvl1, space
  hex: '000081841ff6c628226b1548838bafd047818ef3e4f76916db6f726c2eebf924',
  perlin: SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_ASTEROID_NO_PRODUCE = new TestLocation({
  // byte #8 is 33_16 = 51_10; would produce silver in deep space but not nebula
  // lvl1
  hex: '000081841ff6c628336b1548838bafd047818ef3e4f76916db6f726c2eebf925',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_ASTEROID_DEEP_SPACE = new TestLocation({
  // byte #8 is 33_16 = 51_10; produces silver since it's in deep space
  // lvl1
  hex: '000081841ff6c628336b1548838bafd047818ef3e4f76916db6f726c2eebf926',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_ASTEROID_NEBULA = new TestLocation({
  // byte #8 is 22
  // lvl1
  hex: '000081841ff6c628226b1548838bafd047818ef3e4f76916db6f726c2eebf927',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const LVL3_SPACETIME_1 = new TestLocation({
  // lvl3. byte #8 is 20_16 = 32_10
  hex: '0000818402f6c628206b1548838bafd047818ef3e4f76916db6f726c2eebf924',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL3_SPACETIME_2 = new TestLocation({
  // lvl3. byte #8 is 20_16 = 32_10
  hex: '0000818402f6c628206b1548838bafd047818ef3e4f76916db6f726c2eebf925',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL6_SPACETIME = new TestLocation({
  // lvl6. byte #8 is 20_16 = 32_10
  hex: '00008184000f0028206b1548838bafd047818ef3e4f76916db6f726c2eebf925',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL3_SPACETIME_3 = new TestLocation({
  // lvl3. byte #8 is 20_16 = 32_10
  hex: '0000818402f6c628206b1548838bafd047818ef3e4f76916db6f726c2eebf926',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL1_QUASAR = new TestLocation({
  // lvl1. byte #8 is 08_16 = 08
  hex: '000081841ff6c628086b1548838bafd047818ef3e4f76916db6f726c2eebf923',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const LVL3_UNOWNED_NEBULA = new TestLocation({
  // lvl3
  hex: '0000818402f6c628ff6b1548838bafd047818ef3e4f76916db6f726c2eebf924',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const LVL3_UNOWNED_SPACE = new TestLocation({
  // lvl3
  hex: '0000818402f6c628ff6b1548838bafd047818ef3e4f76916db6f726c2eecf924',
  perlin: SPACE_PERLIN,
  distFromOrigin: 0,
});

export const LVL3_UNOWNED_DEEP_SPACE = new TestLocation({
  // lvl3
  hex: '0000818402f6c628ff6b1548838bafd047818ef3e4f76916db6f726c2eecf925',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 0,
});

export const LVL4_UNOWNED_DEEP_SPACE = new TestLocation({
  // lvl4
  hex: '0000818400f6c628ff6b1548838bafd047818ef3e4f76916db6f726c2eebf924',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const LVL4_UNOWNED_NEBULA = new TestLocation({
  // lvl4
  hex: '0000818400f6c628ff6b1548838bafd047818ef3e4f76916db6f726c2eecf924',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 0,
});

export const MAX_PLANET_NEBULA = new TestLocation({
  // would be a lvl9, but clipped bc it's in nebula
  hex: '0000818400000028ff6b1548838bafd047818ef3e4f76916db6f726c2eecf924',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const MAX_PLANET_SPACE = new TestLocation({
  // would be a lvl9, but clipped bc it's in regular space
  hex: '0000818400000028ff6b1548838bafd047818ef3e4f76916db6f726c2eecf925',
  perlin: SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const MAX_PLANET_DEEP_SPACE = new TestLocation({
  // lvl9
  hex: '0000818400000028ff6b1548838bafd047818ef3e4f76916db6f726c2eecf926',
  perlin: DEEP_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const MAX_PLANET_DEAD_SPACE = new TestLocation({
  // lvl9
  hex: '0000818400000028ff6b1548838bafd047818ef3e4f76916db6f726c2eecf927',
  perlin: DEAD_SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const ARTIFACT_PLANET_1 = new TestLocation({
  // lvl1 ruins. byte #8 is 18_16 = 24_10
  hex: '00007c2512896efb182d462faee6041fb33d58930eb9e6b4fbae6d048e9c44c3',
  perlin: SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const ARTIFACT_PLANET_2 = new TestLocation({
  // lvl1 ruins. byte #8 is 18_16 = 24_10
  hex: '00007c2512896efb182d462faee6041fb33d58930eb9e6b4fbae6d048e9c44c4',
  perlin: SPACE_PERLIN,
  distFromOrigin: 1998,
});

export const ADMIN_PLANET = new TestLocation({
  hex: '0000000000000000000000000000000000000000000000000000000000000069',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const ZERO_PLANET = new TestLocation({
  hex: '0000000000000000000000000000000000000000000000000000000000000069',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

// not under difficulty threshold
export const ADMIN_PLANET_CLOAKED = new TestLocation({
  hex: '0100000000000000000000000000000000000000000000000000000000000069',
  perlin: NEBULA_PERLIN,
  distFromOrigin: 1998,
});

export const INVALID_PLANET = new TestLocation({
  hex: '0001115b379a678bf7076778da66355dc814c5c184bc043e87e011c876418b365',
  perlin: VALID_INIT_PERLIN,
  distFromOrigin: 1998,
});

export const SMALL_INTERVAL = 5; // seconds
export const TOLERANCE = 2; // seconds
export const LARGE_INTERVAL = 3 * 86400; // seconds
