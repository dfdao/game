import { isUnconfirmedUpgradeTx } from '@dfdao/serde';
import { LocationId, Planet, PlanetType, TooltipName, UpgradeBranchName } from '@dfdao/types';
import React from 'react';
import styled from 'styled-components';
import { getPlanetMaxRank, getPlanetRank, isFullRank } from '../../Backend/Utils/Utils';
import { Btn } from '../Components/Btn';
import { CenterBackgroundSubtext, Spacer } from '../Components/CoreUI';
import { LoadingSpinner } from '../Components/LoadingSpinner';
import { Gold, Red, Sub, Subber } from '../Components/Text';
import { useAccount, usePlanet, useUIManager } from '../Utils/AppHooks';
import { useEmitterValue } from '../Utils/EmitterHooks';
import { ModalHandle } from '../Views/ModalPane';
import { TabbedView } from '../Views/TabbedView';
import { UpgradePreview } from '../Views/UpgradePreview';
import { TooltipTrigger } from './Tooltip';

const SECTION_MARGIN = '0.75em';

const SectionPreview = styled.div`
  margin-top: ${SECTION_MARGIN};
`;

const SectionBuy = styled.div`
  margin-top: ${SECTION_MARGIN};
`;

export function UpgradeDetailsPaneHelpContent() {
  return (
    <div>
      <p>
        Upgrades cost Silver, and allow you to boost the stats of your planet. You need to move the
        required silver to this planet to be able to spend it on upgrades.
      </p>
      <Spacer height={8} />
      <p>
        All planets have a certain max rank, and each branch can only be upgraded so many times.
        Choose wisely!
      </p>
    </div>
  );
}

function maxSilverRequired(planet: Planet) {
  const maxRank = getPlanetMaxRank(planet);
  let totalSilverNeeded = 0;

  for (let i = getPlanetRank(planet); i < maxRank; i++) {
    totalSilverNeeded += Math.floor((i + 1) * 0.2 * planet.silverCap);
  }
  return totalSilverNeeded;
}

function nextLevelSilverRequired(planet: Planet) {
  return Math.floor(getPlanetRank(planet) + 1 * 0.2 * planet.silverCap);
}

function SilverRequired({ planet, playerSilver }: { planet: Planet; playerSilver: number }) {
  const maxRank = getPlanetMaxRank(planet);
  const silverPerRank = [];

  for (let i = 0; i < maxRank; i++) {
    silverPerRank[i] = Math.floor((i + 1) * 0.2 * planet.silverCap);
  }

  return (
    <>
      {silverPerRank.map((silver: number, i: number) => (
        <span key={i}>
          {i === getPlanetRank(planet) ? (
            playerSilver >= silver ? (
              <Gold>{silver}</Gold>
            ) : (
              <Red>{silver}</Red>
            )
          ) : (
            <Subber>{silver}</Subber>
          )}
          <Spacer width={8} />
        </span>
      ))}
    </>
  );
}

export function UpgradeDetailsPane({
  initialPlanetId,
  modal: _modal,
}: {
  modal: ModalHandle;
  initialPlanetId: LocationId | undefined;
}) {
  const uiManager = useUIManager();
  const planetId = useEmitterValue(uiManager.selectedPlanetId$, initialPlanetId);
  const planet = usePlanet(uiManager, planetId).value;
  const account = useAccount(uiManager);
  const planetAtMaxRank = isFullRank(planet);

  if (!planet || !account) {
    return (
      <CenterBackgroundSubtext width='100%' height='75px'>
        Select a Planet <br /> You Own
      </CenterBackgroundSubtext>
    );
  }
  if (planet.planetType !== PlanetType.PLANET || planet.silverCap === 0) {
    return (
      <CenterBackgroundSubtext width='100%' height='75px'>
        This Planet <br /> is not Upgradeable
      </CenterBackgroundSubtext>
    );
  }
  return (
    <TabbedView
      tabTitles={['Range', 'Speed']}
      tabContents={(index: number) => {
        const branch = index == 0 ? UpgradeBranchName.Range : UpgradeBranchName.Speed;
        const currentLevel = planet.upgradeState[branch];
        const branchAtMaxRank = !planet || planet.upgradeState[branch] >= 4;
        const upgrade = branchAtMaxRank ? undefined : uiManager.getUpgrade(branch, currentLevel);

        const totalLevel = planet.upgradeState.reduce((a, b) => a + b);
        const silverNeeded = Math.floor((totalLevel + 1) * 0.2 * planet.silverCap);
        const enoughSilver = planet.silver >= silverNeeded;
        const isPendingUpgrade = planet.transactions?.hasTransaction(isUnconfirmedUpgradeTx);
        const canUpgrade =
          enoughSilver && !planetAtMaxRank && !branchAtMaxRank && !isPendingUpgrade;

        const doUpgrade = (branch: UpgradeBranchName) => {
          if (canUpgrade) {
            uiManager.upgrade(planet, branch);
          }
        };

        return (
          <>
            <SectionPreview>
              <UpgradePreview
                upgrade={upgrade}
                planet={planet}
                branchName={branch}
                cantUpgrade={planetAtMaxRank || branchAtMaxRank}
              />
            </SectionPreview>
            <SectionBuy>
              <UpgradeRow>
                <Sub>Silver Available</Sub>: <span>{planet.silver}</span>
              </UpgradeRow>
              <UpgradeRow>
                <TooltipTrigger
                  style={{ textAlign: 'center' }}
                  name={TooltipName.Empty}
                  extraContent={
                    nextLevelSilverRequired(planet) > planet.silver
                      ? 'You need more silver to upgrade!'
                      : `Upgrade this planets' ${branch} by one level.`
                  }
                >
                  <Btn onClick={() => doUpgrade(branch)} disabled={!canUpgrade || isPendingUpgrade}>
                    {isPendingUpgrade ? <LoadingSpinner initialText='Upgrading...' /> : 'Upgrade'}{' '}
                  </Btn>
                </TooltipTrigger>
                <SilverRequired planet={planet} playerSilver={planet.silver} />
              </UpgradeRow>
              <UpgradeRow>
                <TooltipTrigger
                  style={{ textAlign: 'center' }}
                  name={TooltipName.Empty}
                  extraContent={
                    maxSilverRequired(planet) > planet.silver
                      ? 'You need more silver to max upgrade!'
                      : `Max out this planet's ${branch} in a single tx.`
                  }
                >
                  <Btn onClick={() => doUpgrade(branch)} disabled={!canUpgrade || isPendingUpgrade}>
                    Max Upgrade
                  </Btn>
                </TooltipTrigger>

                {maxSilverRequired(planet) > planet.silver ? (
                  <Red>{maxSilverRequired(planet)}</Red>
                ) : (
                  <Gold>{maxSilverRequired(planet)}</Gold>
                )}
              </UpgradeRow>
            </SectionBuy>
          </>
        );
      }}
    />
  );
}

const UpgradeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
`;
