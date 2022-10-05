import { hasStatBoost } from '@dfdao/gamelogic';
import { artifactName } from '@dfdao/procedural';
import {
  Artifact,
  ArtifactRarityNames,
  ArtifactType,
  LocationId,
  Planet,
  TooltipName,
  Upgrade,
} from '@dfdao/types';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getUpgradeStat } from '../../Backend/Utils/Utils';
import { StatIdx } from '../../_types/global/GlobalTypes';
import { ArtifactImage } from '../Components/ArtifactImage';
import { Spacer } from '../Components/CoreUI';
import { StatIcon } from '../Components/Icons';
import { ArtifactRarityLabelAnim, ArtifactTypeText } from '../Components/Labels/ArtifactLabels';
import { ArtifactBiomeLabelAnim } from '../Components/Labels/BiomeLabels';
import { ReadMore } from '../Components/ReadMore';
import { Green, Red, Sub, Text, White } from '../Components/Text';
import { TextPreview } from '../Components/TextPreview';
import { TimeUntil } from '../Components/TimeUntil';
import dfstyles from '../Styles/dfstyles';
import { useUIManager } from '../Utils/AppHooks';
import { ArtifactActions } from './ManagePlanetArtifacts/ArtifactActions';
import { TooltipTrigger } from './Tooltip';

const StatsContainer = styled.div`
  flex-grow: 1;
`;

const ArtifactDetailsHeader = styled.div`
  min-height: 128px;
  display: flex;
  flex-direction: row;

  & > div::last-child {
    flex-grow: 1;
  }

  .statrow {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    & > span:first-child {
      margin-right: 1.5em;
    }

    & > span:last-child {
      text-align: right;
      width: 6em;
      flex-grow: 1;
    }
  }
`;

export function UpgradeStatInfo({
  upgrades,
  stat,
}: {
  upgrades: (Upgrade | undefined)[];
  stat: StatIdx;
}) {
  let mult = 100;

  for (const upgrade of upgrades) {
    if (upgrade) {
      mult *= getUpgradeStat(upgrade, stat) / 100;
    }
  }

  const statName = [
    TooltipName.Energy,
    TooltipName.EnergyGrowth,
    TooltipName.Range,
    TooltipName.Speed,
    TooltipName.Defense,
  ][stat];

  return (
    <div className='statrow'>
      <TooltipTrigger name={statName}>
        <StatIcon stat={stat} />
      </TooltipTrigger>
      <span>
        {mult > 100 && <Green>+{Math.round(mult - 100)}%</Green>}
        {mult === 100 && <Sub>no effect</Sub>}
        {mult < 100 && <Red>-{Math.round(100 - mult)}%</Red>}
      </span>
    </div>
  );
}

const StyledArtifactDetailsBody = styled.div`
  & > div:first-child p {
    text-decoration: underline;
  }

  & .row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    & > span:first-child {
      color: ${dfstyles.colors.subtext};
    }

    & > span:last-child {
      text-align: right;
    }
  }

  & .link {
    &:hover {
      cursor: pointer;
      text-decoration: underline;
    }
  }
`;

const ArtifactName = styled.div`
  color: ${dfstyles.colors.text};
  font-weight: bold;
`;

const ArtifactNameSubtitle = styled.div`
  color: ${dfstyles.colors.subtext};
  margin-bottom: 8px;
`;

export function ArtifactDetailsHelpContent() {
  return (
    <div>
      <p>
        In this pane, you can see specific information about a particular artifact. You can also
        initiate a conversation with the artifact! Try talking to your artifacts. Make some new
        friends (^:
      </p>
    </div>
  );
}

export function ArtifactDetailsBody({
  planet,
  artifact,
  depositOn,
  noActions,
}: {
  planet?: Planet;
  artifact: Artifact;
  depositOn?: LocationId;
  noActions?: boolean;
}) {
  const uiManager = useUIManager();

  // TODO: I don't like the async nature of this...we should have the logic on the client somehow
  const [upgrade, setUpgrade] = useState<Upgrade | undefined>(undefined);
  useEffect(() => {
    uiManager.getUpgradeForArtifact(artifact.id).then(setUpgrade);
  }, [uiManager, artifact, setUpgrade]);

  let readyInStr = undefined;

  if (
    planet &&
    artifact.artifactType === ArtifactType.PhotoidCannon &&
    planet.activeArtifact?.id === artifact.id
  ) {
    readyInStr = (
      <TimeUntil
        timestamp={
          planet.artifactActivationTime * 1000 +
          uiManager.contractConstants.PHOTOID_ACTIVATION_DELAY * 1000
        }
        ifPassed={'now!'}
      />
    );
  }

  return (
    <>
      <div style={{ display: 'inline-block' }}>
        <ArtifactImage artifact={artifact} size={32} />
      </div>
      <Spacer width={8} />
      <div style={{ display: 'inline-block' }}>
        <ArtifactName>{artifactName(artifact)}</ArtifactName>
        <ArtifactNameSubtitle>
          <ArtifactRarityLabelAnim rarity={artifact.rarity} />{' '}
          <ArtifactBiomeLabelAnim artifact={artifact} />
          <ArtifactTypeText artifact={artifact} />
        </ArtifactNameSubtitle>
      </div>

      {hasStatBoost(artifact.artifactType) && (
        <ArtifactDetailsHeader>
          <StatsContainer>
            {_.range(0, 5).map((val) => (
              <UpgradeStatInfo
                upgrades={[upgrade, planet?.localPhotoidUpgrade]}
                stat={val}
                key={val}
              />
            ))}
          </StatsContainer>
        </ArtifactDetailsHeader>
      )}

      <StyledArtifactDetailsBody>
        <ArtifactDescription artifact={artifact} />
        <Spacer height={8} />

        <div className='row'>
          <span>ID</span>
          <TextPreview text={artifact.id} />
        </div>

        {readyInStr && (
          <div className='row'>
            <span>Ready In</span>
            <span>{readyInStr}</span>
          </div>
        )}

        {!noActions && (
          <ArtifactActions artifact={artifact} planet={planet} depositOn={depositOn} />
        )}
      </StyledArtifactDetailsBody>
    </>
  );
}

function ArtifactDescription({
  artifact,
  collapsable,
}: {
  artifact: Artifact;
  collapsable?: boolean;
}) {
  let content;

  const maxLevelsBlackDomain = [0, 2, 4, 6, 8, 9];
  const maxLevelBlackDomain = maxLevelsBlackDomain[artifact.rarity];

  const maxLevelsBloomFilter = [0, 2, 4, 6, 8, 9];
  const maxLevelBloomFilter = maxLevelsBloomFilter[artifact.rarity];

  const wormholeShrinkLevels = [0, 2, 4, 8, 16, 32];
  const rarityName = ArtifactRarityNames[artifact.rarity];
  const photoidRanges = [0, 2, 2, 2, 2, 2];
  const photoidSpeeds = [0, 5, 10, 15, 20, 25];

  // const genericSpaceshipDescription = <>Can move between planets without sending energy.</>;

  switch (artifact.artifactType) {
    case ArtifactType.BlackDomain:
      content = (
        <Text>
          When activated, permanently disables your planet. It'll still be yours, but you won't be
          able to do anything with it. It turns completely black too. Just ... gone. Because this
          one is <White>{rarityName}</White>, it works on planets up to level{' '}
          <White>{maxLevelBlackDomain}</White>. This artifact is consumed on activation.
        </Text>
      );
      break;
    case ArtifactType.BloomFilter:
      content = (
        <Text>
          When activated refills your planet's energy and silver to their respective maximum values.
          How it does this, we do not know. Because this one is <White>{rarityName}</White>, it
          works on planets up to level <White>{maxLevelBloomFilter}</White>. This artifact is
          consumed on activation.
        </Text>
      );
      break;
    case ArtifactType.Wormhole:
      content = (
        <Text>
          When activated, shortens the distance between this planet and another one. All moves
          between those two planets decay less energy, and complete faster.{' '}
          <Red>
            Energy sent through your wormhole to a planet you do not control does not arrive.
          </Red>{' '}
          Because this one is <White>{rarityName}</White>, it shrinks the distance by a factor of{' '}
          <White>{wormholeShrinkLevels[artifact.rarity]}</White>x.
        </Text>
      );
      break;
    case ArtifactType.PhotoidCannon:
      content = (
        <Text>
          Ahh, the Photoid Canon. Activate it, wait four hours. Because this one is{' '}
          <White>{rarityName}</White>, the next move you send will be able to go{' '}
          <White>{photoidRanges[artifact.rarity]}</White>x further and{' '}
          <White>{photoidSpeeds[artifact.rarity]}</White>x faster. During the 4 hour waiting period,
          your planet's defense is temporarily decreased. This artifact is consumed once the canon
          is fired.
        </Text>
      );
      break;
    case ArtifactType.PlanetaryShield:
      content = (
        <Text>
          Activate the planetary shield to gain a defense bonus on your planet, at the expense of
          range and speed. When this artifact is deactivated, it is destroyed and your planet's
          stats are reverted--so use it wisely!
        </Text>
      );
      break;
    // case ArtifactType.ShipMothership:
    //   content = (
    //     <Text>
    //       Doubles energy regeneration of the planet that it is currently on.{' '}
    //       {genericSpaceshipDescription}
    //     </Text>
    //   );
    //   break;
    // case ArtifactType.ShipCrescent:
    //   content = (
    //     <Text>
    //       Activate to convert an un-owned planet whose level is more than 0 into an Asteroid Field.{' '}
    //       <Red>Can only be used once.</Red> {genericSpaceshipDescription}
    //     </Text>
    //   );
    //   break;
    // case ArtifactType.ShipGear:
    //   content = (
    //     <Text>
    //       Allows you to prospect planets, and subsequently find artifacts on them.{' '}
    //       {genericSpaceshipDescription}
    //     </Text>
    //   );
    //   break;
    // case ArtifactType.ShipTitan:
    //   content = (
    //     <Text>
    //       Pauses energy and silver regeneration on the planet it's on. {genericSpaceshipDescription}
    //     </Text>
    //   );
    //   break;
    // case ArtifactType.ShipWhale:
    //   content = (
    //     <Text>
    //       Doubles the silver regeneration of the planet that it is currently on.{' '}
    //       {genericSpaceshipDescription}
    //     </Text>
    //   );
    //   break;
  }

  if (content) {
    return (
      <div>
        {collapsable ? (
          <ReadMore height={'1.2em'} toggleButtonMargin={'0em'}>
            {content}
          </ReadMore>
        ) : (
          content
        )}
      </div>
    );
  }

  return null;
}
