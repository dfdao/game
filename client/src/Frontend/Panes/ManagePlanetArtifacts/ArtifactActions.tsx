import { isLocatable } from '@dfdao/gamelogic';
import {
  isUnconfirmedActivateArtifactTx,
  isUnconfirmedDeactivateArtifactTx,
  isUnconfirmedDepositArtifactTx,
  isUnconfirmedWithdrawArtifactTx,
} from '@dfdao/serde';
import { Artifact, ArtifactType, LocationId, Planet, PlanetType, TooltipName } from '@dfdao/types';
import React, { useCallback } from 'react';
import { Btn } from '../../Components/Btn';
import { Spacer } from '../../Components/CoreUI';
import { ArtifactRarityLabelAnim } from '../../Components/Labels/ArtifactLabels';
import { LoadingSpinner } from '../../Components/LoadingSpinner';
import { useAccount, useMyArtifactsList, usePlanet, useUIManager } from '../../Utils/AppHooks';
import { TooltipTrigger, TooltipTriggerProps } from '../Tooltip';

function hasArtifact(planet: Planet, artifact: Artifact) {
  return planet.artifacts.some(({ id }) => id === artifact.id);
}

export function ArtifactActions({
  artifact,
  planet,
  depositOn,
}: {
  artifact: Artifact;
  planet?: Planet;
  depositOn?: LocationId;
}) {
  const uiManager = useUIManager();
  const account = useAccount(uiManager);

  const myArtifacts = useMyArtifactsList(uiManager);

  const depositPlanetWrapper = usePlanet(uiManager, depositOn);
  const depositPlanet = depositPlanetWrapper.value;

  const onPlanetWrapper = usePlanet(uiManager, planet?.locationId);
  const onPlanet = onPlanetWrapper.value;

  const withdraw = useCallback(
    (artifact: Artifact) => {
      if (onPlanet && hasArtifact(onPlanet, artifact)) {
        uiManager.withdrawArtifact(onPlanet.locationId, artifact.id);
      }
    },
    [onPlanet, uiManager]
  );

  const deposit = useCallback(
    (artifact: Artifact) => {
      depositPlanetWrapper.value &&
        uiManager.depositArtifact(depositPlanetWrapper.value.locationId, artifact.id);
    },
    [uiManager, depositPlanetWrapper.value]
  );

  const activate = useCallback(
    async (artifact: Artifact) => {
      if (isLocatable(onPlanet) && hasArtifact(onPlanet, artifact)) {
        let targetPlanetId = undefined;

        if (artifact.artifactType === ArtifactType.Wormhole) {
          const targetPlanet = await uiManager.startWormholeFrom(onPlanet);
          targetPlanetId = targetPlanet?.locationId;
        }

        uiManager.activateArtifact(onPlanet.locationId, artifact.id, targetPlanetId);
      }
    },
    [onPlanet, uiManager]
  );

  const deactivate = useCallback(
    (artifact: Artifact) => {
      if (onPlanet && hasArtifact(onPlanet, artifact)) {
        uiManager.deactivateArtifact(onPlanet.locationId, artifact.id);
      }
    },
    [onPlanet, uiManager]
  );

  if (!artifact || !onPlanet || !account) return null;

  const actions: TooltipTriggerProps[] = [];

  const withdrawing = onPlanet.transactions?.hasTransaction(isUnconfirmedWithdrawArtifactTx);
  const depositing = onPlanet.transactions?.hasTransaction(isUnconfirmedDepositArtifactTx);
  const activating = onPlanet.transactions?.hasTransaction(isUnconfirmedActivateArtifactTx);
  const deactivating = onPlanet.transactions?.hasTransaction(isUnconfirmedDeactivateArtifactTx);

  const canHandleDeposit =
    depositPlanetWrapper.value && depositPlanetWrapper.value.planetLevel > artifact.rarity;
  const canHandleWithdraw = onPlanet && onPlanet.planetLevel > artifact.rarity;

  const canDepositArtifact =
    depositPlanet &&
    !depositPlanet.destroyed &&
    depositPlanet.owner === account &&
    depositPlanet.planetType === PlanetType.TRADING_POST &&
    myArtifacts.some(({ id }) => id === artifact.id);

  const canWithdrawArtifact =
    onPlanet &&
    !onPlanet.destroyed &&
    onPlanet.owner === account &&
    onPlanet.planetType === PlanetType.TRADING_POST &&
    hasArtifact(onPlanet, artifact) &&
    onPlanet.activeArtifact?.id !== artifact.id;

  const canDeactivateArtifact =
    onPlanet.activeArtifact?.id === artifact.id &&
    artifact.artifactType !== ArtifactType.BlackDomain;

  const canActivateArtifact =
    onPlanet.activeArtifact === undefined && hasArtifact(onPlanet, artifact);

  if (canDepositArtifact) {
    actions.unshift({
      name: TooltipName.DepositArtifact,
      extraContent: !canHandleDeposit && (
        <>
          . <ArtifactRarityLabelAnim rarity={artifact.rarity} />
          {` artifacts can only be deposited on level ${artifact.rarity + 1}+ spacetime rips`}
        </>
      ),
      children: (
        <Btn
          disabled={depositing}
          onClick={(e) => {
            e.stopPropagation();
            canHandleDeposit && deposit(artifact);
          }}
        >
          {depositing ? <LoadingSpinner initialText={'Depositing...'} /> : 'Deposit'}
        </Btn>
      ),
    });
  }
  if (canDeactivateArtifact) {
    actions.unshift({
      name: TooltipName.DeactivateArtifact,
      children: (
        <Btn
          disabled={deactivating}
          onClick={(e) => {
            e.stopPropagation();
            deactivate(artifact);
          }}
        >
          {deactivating ? <LoadingSpinner initialText={'Deactivating...'} /> : 'Deactivate'}
        </Btn>
      ),
    });
  }
  if (canWithdrawArtifact) {
    actions.unshift({
      name: TooltipName.WithdrawArtifact,
      extraContent: !canHandleWithdraw && (
        <>
          . <ArtifactRarityLabelAnim rarity={artifact.rarity} />
          {` artifacts can only be withdrawn from level ${artifact.rarity + 1}+ spacetime rips`}
        </>
      ),
      children: (
        <Btn
          disabled={withdrawing}
          onClick={(e) => {
            e.stopPropagation();
            canHandleWithdraw && withdraw(artifact);
          }}
        >
          {withdrawing ? <LoadingSpinner initialText={'Withdrawing...'} /> : 'Withdraw'}
        </Btn>
      ),
    });
  }

  if (canActivateArtifact) {
    actions.unshift({
      name: TooltipName.ActivateArtifact,
      children: (
        <Btn
          disabled={activating}
          onClick={(e) => {
            e.stopPropagation();
            activate(artifact);
          }}
        >
          {activating ? <LoadingSpinner initialText={'Activating...'} /> : 'Activate'}
        </Btn>
      ),
    });
  }

  return (
    <div>
      {actions.length > 0 && <Spacer height={4} />}
      {actions.map((a, i) => (
        <span key={i}>
          <TooltipTrigger {...a} />
          <Spacer width={4} />
        </span>
      ))}
    </div>
  );
}
