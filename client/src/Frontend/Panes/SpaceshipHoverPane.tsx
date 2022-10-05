import { decodeSpaceship, spaceshipIdToEthersBN } from '@dfdao/serde';
import React from 'react';
import { useHoverSpaceshipId, useUIManager } from '../Utils/AppHooks';
import { HoverPane } from './HoverPane';
import { SpaceshipCard } from './SpaceshipCard';

export function SpaceshipHoverPane() {
  const uiManager = useUIManager();
  const hoverSpaceshipId = useHoverSpaceshipId(uiManager);

  if (!hoverSpaceshipId.value) return null;

  const spaceship = decodeSpaceship(spaceshipIdToEthersBN(hoverSpaceshipId.value));

  return <HoverPane visible={true} element={<SpaceshipCard spaceship={spaceship} />} />;
}
