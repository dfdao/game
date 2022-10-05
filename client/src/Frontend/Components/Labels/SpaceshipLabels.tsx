import { Spaceship, SpaceshipTypeNames } from '@dfdao/types';
import React from 'react';

export const SpaceshipTypeText = ({ spaceship }: { spaceship: Spaceship }) => (
  <>{SpaceshipTypeNames[spaceship.spaceshipType]}</>
);
