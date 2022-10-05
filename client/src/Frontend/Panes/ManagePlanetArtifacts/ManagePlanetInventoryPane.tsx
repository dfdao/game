import { isLocatable } from '@dfdao/gamelogic';
import { Artifact, LocatablePlanet, LocationId, PlanetType } from '@dfdao/types';
import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { CenterBackgroundSubtext, Spacer, Underline } from '../../Components/CoreUI';
import { useAccount, useMyArtifactsList, usePlanet, useUIManager } from '../../Utils/AppHooks';
import { useEmitterValue } from '../../Utils/EmitterHooks';
import { ModalHandle } from '../../Views/ModalPane';
import { TabbedView } from '../../Views/TabbedView';
import { ArtifactsList } from '../ArtifactsList';
import { SpaceshipsList } from '../SpaceshipsList';

export function PlanetInfoHelpContent() {
  return (
    <div>
      <p>Metadata related to this planet.</p>
    </div>
  );
}

export function ManagePlanetInventoryHelpContent() {
  return (
    <div>
      <p>
        Using this pane, you can manage the Artifacts and Spaceships that are on this planet
        specifically. You can activate a single artifact at a time.
      </p>
      <br />
      <p>
        If your planet is a <Underline>Spacetime Rip</Underline>, you can also withdraw and deposit
        Artifacts. When you withdraw an Artifact, it is transferred to your address as an ERC1155
        token.
      </p>
    </div>
  );
}

const TabWrapper = styled.div`
  min-height: 200px;
  max-height: 400px;
  overflow-y: scroll;
`;

function ManageInventoryPane({
  planet,
  artifactsInWallet,
  playerAddress,
  modal,
}: {
  planet: LocatablePlanet;
  artifactsInWallet: Artifact[];
  playerAddress: string;
  modal: ModalHandle;
}) {
  const isMyTradingPost =
    planet.owner === playerAddress &&
    planet.planetType === PlanetType.TRADING_POST &&
    !planet.destroyed;
  const [viewingDepositList, setViewingDepositList] = useState(false);

  let action;

  useEffect(() => {
    setViewingDepositList(false);
  }, [planet.locationId, playerAddress]);

  return (
    <>
      <TabWrapper>
        <TabbedView
          style={{ height: '100%' }}
          tabTitles={['artifacts', 'ships']}
          tabContents={(i) => {
            if (i === 0) {
              const artifacts = viewingDepositList ? artifactsInWallet : planet.artifacts;
              if (artifacts.length === 0) {
                return (
                  <CenterBackgroundSubtext width='100%' height='100px'>
                    You don't have any <br /> Artifacts{' '}
                    {viewingDepositList ? 'in your wallet' : 'on this planet'}
                  </CenterBackgroundSubtext>
                );
              }

              return (
                <ArtifactsList
                  planet={planet}
                  maxRarity={viewingDepositList ? planet.planetLevel - 1 : undefined}
                  depositOn={viewingDepositList ? planet.locationId : undefined}
                  artifacts={artifacts}
                  modal={modal}
                />
              );
            }

            if (planet.spaceships.length === 0) {
              return (
                <CenterBackgroundSubtext width='100%' height='100px'>
                  You don't have any <br /> Spaceships on this planet
                </CenterBackgroundSubtext>
              );
            }

            return (
              <SpaceshipsList
                depositOn={viewingDepositList ? planet.locationId : undefined}
                spaceships={planet.spaceships}
                modal={modal}
              />
            );
          }}
        />
      </TabWrapper>

      {action && (
        <>
          <Spacer height={8} />
          {action}
          <Spacer height={8} />
        </>
      )}

      <Spacer height={4} />

      {isMyTradingPost && (
        <SelectArtifactsContainer>
          <SelectArtifactList
            selected={!viewingDepositList}
            onClick={() => {
              setViewingDepositList(false);
            }}
          >
            On This Planet
          </SelectArtifactList>
          <SelectArtifactList
            selected={viewingDepositList}
            onClick={() => {
              setViewingDepositList(true);
            }}
          >
            Deposit Artifact
          </SelectArtifactList>
        </SelectArtifactsContainer>
      )}
    </>
  );
}

const SelectArtifactsContainer = styled.div`
  padding: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
`;

const SelectArtifactList = styled.span`
  ${({ selected }: { selected?: boolean }) => css`
    ${selected && 'text-decoration: underline;'}
    cursor: pointer;
  `}
`;

/**
 * This is the place where a user can manage all of their Artifacts & Spaceships on a
 * particular planet. This includes prospecting, withdrawing, depositing,
 * activating, and deactivating artifacts.
 */
export function ManagePlanetInventoryPane({
  initialPlanetId,
  modal,
}: {
  initialPlanetId: LocationId | undefined;
  modal: ModalHandle;
}) {
  const uiManager = useUIManager();
  const account = useAccount(uiManager);
  const planetId = useEmitterValue(uiManager.selectedPlanetId$, initialPlanetId);
  const planet = usePlanet(uiManager, planetId).value;
  const myArtifacts = useMyArtifactsList(uiManager);

  if (planet && isLocatable(planet) && account) {
    return (
      <ManageInventoryPane
        artifactsInWallet={myArtifacts}
        planet={planet}
        playerAddress={account}
        modal={modal}
      />
    );
  } else {
    return (
      <CenterBackgroundSubtext width='100%' height='75px'>
        Select a Planet
      </CenterBackgroundSubtext>
    );
  }
}
