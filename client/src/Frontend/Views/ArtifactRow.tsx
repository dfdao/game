import { isActivated } from '@dfdao/gamelogic';
import { Artifact, Planet } from '@dfdao/types';
import React, { useCallback, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { ArtifactImage } from '../Components/ArtifactImage';
import { Btn } from '../Components/Btn';
import { Spacer } from '../Components/CoreUI';
import dfstyles from '../Styles/dfstyles';
import { useAccount, useUIManager } from '../Utils/AppHooks';

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

const StyledArtifactThumb = styled.div<{ active: boolean }>`
  min-width: 2.5em;
  min-height: 2.5em;
  width: 2.5em;
  height: 2.5em;

  border: 1px solid ${dfstyles.colors.borderDark};
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

function ArtifactThumb({
  artifact,
  selectedArtifact,
  onArtifactChange,
}: {
  selectedArtifact?: Artifact | undefined;
  onArtifactChange?: (artifact: Artifact | undefined) => void;
  artifact: Artifact;
}) {
  const uiManager = useUIManager();

  const click = useCallback(() => {
    if (!onArtifactChange) return;

    if (artifact.id === selectedArtifact?.id) {
      onArtifactChange(undefined);
    } else {
      onArtifactChange(artifact);
    }
  }, [onArtifactChange, artifact, selectedArtifact]);

  useEffect(() => {
    // this is called when the component is unrendered
    return () => uiManager?.setHoveringOverArtifact(undefined);
  }, [uiManager]);

  return (
    <StyledArtifactThumb
      active={selectedArtifact?.id === artifact.id}
      onClick={click}
      onMouseEnter={() => {
        uiManager?.setHoveringOverArtifact(artifact.id);
      }}
      onMouseLeave={() => {
        uiManager?.setHoveringOverArtifact(undefined);
      }}
    >
      <ArtifactImage artifact={artifact} thumb size={32} />
    </StyledArtifactThumb>
  );
}

export function SelectArtifactRow({
  planet,
  selectedArtifact,
  onArtifactChange,
  artifacts,
}: {
  planet: Planet;
  selectedArtifact?: Artifact | undefined;
  onArtifactChange?: (artifact: Artifact | undefined) => void;
  artifacts: Artifact[];
}) {
  const uiManager = useUIManager();
  const account = useAccount(uiManager);

  const owned = planet.owner === account;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <RowWrapper>
        {artifacts.length > 0 &&
          artifacts.map((a) => (
            <span key={a.id}>
              <ArtifactThumb
                artifact={a}
                selectedArtifact={selectedArtifact}
                onArtifactChange={onArtifactChange}
              />
              <Spacer width={4} />
            </span>
          ))}
      </RowWrapper>
      {owned && (
        <Btn size='small' disabled={!selectedArtifact}>
          {isActivated(selectedArtifact, planet) ? 'deactivate' : 'activate'}
        </Btn>
      )}
    </div>
  );
}
