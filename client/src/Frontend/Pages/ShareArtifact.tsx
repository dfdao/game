import { artifactIdToEthersBN, decodeArtifact } from '@dfdao/serde';
import { Artifact, ArtifactId } from '@dfdao/types';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Share } from '../Views/Share';

export function ShareArtifact({ match }: RouteComponentProps<{ artifactId: ArtifactId }>) {
  async function load() {
    return decodeArtifact(artifactIdToEthersBN(match.params.artifactId));
  }

  return (
    <Share load={load}>
      {(artifact: Artifact | undefined, loading: boolean, error: Error | undefined) => {
        if (error) {
          return 'error';
        }

        if (loading) {
          return 'loading';
        }

        return JSON.stringify(artifact);
      }}
    </Share>
  );
}
