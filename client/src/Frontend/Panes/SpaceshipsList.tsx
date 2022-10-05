import { spaceshipName } from '@dfdao/procedural';
import { LocationId, Spaceship, SpaceshipTypeNames } from '@dfdao/types';
import React, { useCallback, useEffect } from 'react';
import { Link } from '../Components/CoreUI';
import { Sub } from '../Components/Text';
import dfstyles from '../Styles/dfstyles';
import { useUIManager } from '../Utils/AppHooks';
import { ModalHandle } from '../Views/ModalPane';
import { SortableTable } from '../Views/SortableTable';

function SpaceshipLink({
  modal,
  children,
  spaceship,
  depositOn,
}: {
  modal?: ModalHandle;
  spaceship: Spaceship;
  children: React.ReactNode | React.ReactNode[];
  depositOn?: LocationId;
}) {
  const uiManager = useUIManager();

  useEffect(() => {
    // this is called when the component is unrendered
    return () => uiManager?.setHoveringOverSpaceship(undefined);
  }, [uiManager]);

  const onClick = useCallback(() => {
    uiManager?.setHoveringOverSpaceship(undefined);
    modal &&
      modal.push({
        element() {
          //   return (
          //     <ArtifactDetailsPane depositOn={depositOn} artifactId={artifact?.id} modal={modal} />
          //   );
          return <span></span>;
        },
        title: spaceshipName(spaceship),
      });
  }, [spaceship, modal, depositOn, uiManager]);

  return (
    <Link
      color={dfstyles.colors.text}
      onClick={onClick}
      onMouseDown={() => {
        uiManager?.setHoveringOverSpaceship(undefined);
      }}
      onMouseEnter={() => {
        uiManager?.setHoveringOverSpaceship(spaceship.id);
      }}
      onMouseLeave={() => {
        uiManager?.setHoveringOverSpaceship(undefined);
      }}
    >
      {children}
    </Link>
  );
}

export function SpaceshipsList({
  modal,
  spaceships,
  depositOn,
}: {
  modal: ModalHandle;
  spaceships: Spaceship[];
  depositOn?: LocationId;
}) {
  const headers = ['Name', 'Type'];
  const alignments: Array<'r' | 'c' | 'l'> = ['l', 'r'];

  const columns = [
    (spaceship: Spaceship) => (
      <SpaceshipLink depositOn={depositOn} modal={modal} spaceship={spaceship}>
        {spaceshipName(spaceship)}
      </SpaceshipLink>
    ),
    (spaceship: Spaceship) => <Sub>{SpaceshipTypeNames[spaceship.spaceshipType]}</Sub>,
  ];

  const sortFunctions = [
    (left: Spaceship, right: Spaceship) => spaceshipName(left).localeCompare(spaceshipName(right)),
    (left: Spaceship, right: Spaceship) =>
      SpaceshipTypeNames[left.spaceshipType]?.localeCompare(
        SpaceshipTypeNames[right.spaceshipType] || ''
      ) || 0,
  ];

  return (
    <SortableTable
      paginated={false}
      rows={spaceships}
      headers={headers}
      columns={columns}
      sortFunctions={sortFunctions}
      alignments={alignments}
    />
  );
}
