import { artifactName } from '@dfdao/procedural';
import { Artifact, ArtifactTypeNames, LocationId, Planet } from '@dfdao/types';
import React, { useCallback, useEffect } from 'react';
import { Link } from '../Components/CoreUI';
import { ArtifactRarityLabelAnim } from '../Components/Labels/ArtifactLabels';
import { Sub } from '../Components/Text';
import { ArtifactDetailsBody } from '../Panes/ArtifactDetailsPane';
import dfstyles from '../Styles/dfstyles';
import { useUIManager } from '../Utils/AppHooks';
import { ModalHandle } from '../Views/ModalPane';
import { SortableTable } from '../Views/SortableTable';

function ArtifactLink({
  modal,
  children,
  planet,
  artifact,
  depositOn,
}: {
  modal?: ModalHandle;
  planet?: Planet;
  artifact: Artifact;
  children: React.ReactNode | React.ReactNode[];
  depositOn?: LocationId;
}) {
  const uiManager = useUIManager();

  useEffect(() => {
    // this is called when the component is unrendered
    return () => uiManager?.setHoveringOverArtifact(undefined);
  }, [uiManager]);

  const onClick = useCallback(() => {
    uiManager?.setHoveringOverArtifact(undefined);
    modal &&
      modal.push({
        element() {
          return <ArtifactDetailsBody planet={planet} depositOn={depositOn} artifact={artifact} />;
        },
        title: artifactName(artifact),
      });
  }, [artifact, planet, modal, depositOn, uiManager]);

  return (
    <Link
      color={dfstyles.colors.text}
      onClick={onClick}
      onMouseDown={() => {
        uiManager?.setHoveringOverArtifact(undefined);
      }}
      onMouseEnter={() => {
        uiManager?.setHoveringOverArtifact(artifact.id);
      }}
      onMouseLeave={() => {
        uiManager?.setHoveringOverArtifact(undefined);
      }}
    >
      {children}
    </Link>
  );
}

export function ArtifactsList({
  modal,
  planet,
  artifacts,
  depositOn,
  maxRarity,
}: {
  modal: ModalHandle;
  planet?: Planet;
  artifacts: Artifact[];
  depositOn?: LocationId;
  maxRarity?: number;
}) {
  if (maxRarity !== undefined) {
    artifacts = artifacts.filter((a) => a.rarity <= maxRarity);
  }
  const headers = ['Name', 'Type', 'Rarity'];
  const alignments: Array<'r' | 'c' | 'l'> = ['l', 'c', 'r'];

  const columns = [
    (artifact: Artifact) => (
      <ArtifactLink planet={planet} depositOn={depositOn} modal={modal} artifact={artifact}>
        {artifactName(artifact)}
      </ArtifactLink>
    ),
    (artifact: Artifact) => <Sub>{ArtifactTypeNames[artifact.artifactType]}</Sub>,
    (artifact: Artifact) => <ArtifactRarityLabelAnim rarity={artifact.rarity} />,
  ];

  const sortFunctions = [
    (left: Artifact, right: Artifact) => artifactName(left).localeCompare(artifactName(right)),
    (left: Artifact, right: Artifact) =>
      ArtifactTypeNames[left.artifactType]?.localeCompare(
        ArtifactTypeNames[right.artifactType] || ''
      ) || 0,
    (left: Artifact, right: Artifact) => left.rarity - right.rarity,
  ];

  return (
    <SortableTable
      paginated={false}
      rows={artifacts}
      headers={headers}
      columns={columns}
      sortFunctions={sortFunctions}
      alignments={alignments}
    />
  );
}
