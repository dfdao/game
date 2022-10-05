import { Spaceship } from '@dfdao/types';
import React from 'react';
import { Padded } from '../Components/CoreUI';
import { SpaceshipDetailsBody } from './SpaceshipDetailsPane';

export function SpaceshipCard({ spaceship }: { spaceship: Spaceship }) {
  return (
    <Padded>
      <SpaceshipDetailsBody spaceship={spaceship} />
    </Padded>
  );
}
