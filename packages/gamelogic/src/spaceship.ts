import { RenderedSpaceship, SpaceshipType } from '@dfdao/types';

export function spaceshipFileName(spaceship: RenderedSpaceship): string | undefined {
  const { spaceshipType: type } = spaceship;

  switch (type) {
    case SpaceshipType.ShipWhale:
      return '64-whale.png';
    case SpaceshipType.ShipMothership:
      return '64-mothership.png';
    case SpaceshipType.ShipCrescent:
      return '64-crescent.png';
    case SpaceshipType.ShipGear:
      return '64-gear.png';
    case SpaceshipType.ShipTitan:
      return '64-titan.png';
  }
}
