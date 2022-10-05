import { Artifact, Planet } from '@dfdao/types';
import React from 'react';
import { Padded } from '../Components/CoreUI';
import { ArtifactDetailsBody } from './ArtifactDetailsPane';

export function ArtifactCard({ planet, artifact }: { planet: Planet; artifact: Artifact }) {
  return (
    <Padded>
      <ArtifactDetailsBody planet={planet} noActions={true} artifact={artifact} />
    </Padded>
  );
}
