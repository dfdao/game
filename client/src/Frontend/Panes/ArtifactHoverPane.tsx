import { artifactIdToEthersBN, decodeArtifact } from '@dfdao/serde';
import { Planet } from '@dfdao/types';
import React from 'react';
import { useHoverArtifactId, useUIManager } from '../Utils/AppHooks';
import { ArtifactCard } from './ArtifactCard';
import { HoverPane } from './HoverPane';

export function ArtifactHoverPane({ planet }: { planet: Planet }) {
  const uiManager = useUIManager();
  const hoverArtifactId = useHoverArtifactId(uiManager);

  if (!hoverArtifactId.value) return null;

  const artifact = decodeArtifact(artifactIdToEthersBN(hoverArtifactId.value));

  return (
    <HoverPane visible={true} element={<ArtifactCard planet={planet} artifact={artifact} />} />
  );
}
