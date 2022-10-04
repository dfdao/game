import { Spaceship } from '@dfdao/types';
import React, { useCallback, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { Spacer } from '../Components/CoreUI';
import { SpaceshipImage } from '../Components/SpaceshipImage';
import dfstyles from '../Styles/dfstyles';
import { useMySpaceshipsList, useUIManager } from '../Utils/AppHooks';

const RowWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: 'space-around';
  align-items: center;
  overflow-x: scroll;
`;

const thumbActive = css`
  border: 1px solid ${dfstyles.colors.border};
  background-color: ${dfstyles.colors.border};
`;

const StyledSpaceshipThumb = styled.div<{ active: boolean; enemy: boolean }>`
  min-width: 2.5em;
  min-height: 2.5em;
  width: 2.5em;
  height: 2.5em;

  border: 1px solid ${({ enemy }) => (enemy ? dfstyles.colors.dfred : dfstyles.colors.borderDark)};
  border-radius: 4px;

  &:last-child {
    margin-right: none;
  }

  display: inline-flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;

  background: ${dfstyles.colors.artifactBackground};

  &:hover {
    ${thumbActive}
    cursor: pointer;

    & > div {
      filter: brightness(1.2);
    }
  }

  ${({ active }) => active && thumbActive}
`;

export function SpaceshipThumb({
  spaceship,
  selectedSpaceship,
  onSpaceshipChange,
}: {
  spaceship: Spaceship;
  selectedSpaceship?: Spaceship | undefined;
  onSpaceshipChange?: (spaceship: Spaceship | undefined) => void;
}) {
  const uiManager = useUIManager();
  const mySpaceships = useMySpaceshipsList(uiManager);
  const mine = mySpaceships.some(({ id }) => spaceship.id === id);

  const click = useCallback(() => {
    if (!onSpaceshipChange || !mine) return;

    if (spaceship.id === selectedSpaceship?.id) {
      onSpaceshipChange(undefined);
    } else {
      onSpaceshipChange(spaceship);
    }
  }, [onSpaceshipChange, spaceship, selectedSpaceship, mine]);

  useEffect(() => {
    // this is called when the component is unrendered
    return () => uiManager?.setHoveringOverSpaceship(undefined);
  }, [uiManager]);

  return (
    <StyledSpaceshipThumb
      active={selectedSpaceship?.id === spaceship.id}
      enemy={!mine}
      onClick={click}
      onMouseEnter={() => {
        uiManager?.setHoveringOverSpaceship(spaceship.id);
      }}
      onMouseLeave={() => {
        uiManager?.setHoveringOverSpaceship(undefined);
      }}
    >
      <SpaceshipImage spaceship={spaceship} size={32} />
    </StyledSpaceshipThumb>
  );
}

export function SelectSpaceshipRow({
  spaceships,
  selectedSpaceship,
  onSpaceshipChange,
}: {
  spaceships: Spaceship[];
  selectedSpaceship?: Spaceship | undefined;
  onSpaceshipChange?: (spaceship: Spaceship | undefined) => void;
}) {
  return (
    <RowWrapper>
      {spaceships.length > 0 &&
        spaceships.map((spaceship) => (
          <span key={spaceship.id}>
            <SpaceshipThumb
              spaceship={spaceship}
              selectedSpaceship={selectedSpaceship}
              onSpaceshipChange={onSpaceshipChange}
            />
            <Spacer width={4} />
          </span>
        ))}
    </RowWrapper>
  );
}
