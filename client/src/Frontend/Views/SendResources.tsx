import { formatNumber } from '@dfdao/gamelogic';
import { nameOfArtifact, nameOfSpaceship } from '@dfdao/procedural';
import {
  isUnconfirmedMoveTx,
  isUnconfirmedReleaseTx,
  isUnconfirmedWithdrawSilverTx,
} from '@dfdao/serde';
import { Artifact, Planet, Spaceship, TooltipName } from '@dfdao/types';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Wrapper } from '../../Backend/Utils/Wrapper';
import { StatIdx } from '../../_types/global/GlobalTypes';
import { Btn } from '../Components/Btn';
import { Icon, IconType } from '../Components/Icons';
import { LoadingSpinner } from '../Components/LoadingSpinner';
import { MaybeShortcutButton } from '../Components/MaybeShortcutButton';
import { Row } from '../Components/Row';
import { Slider } from '../Components/Slider';
import { LongDash, Subber } from '../Components/Text';
import { TooltipTrigger } from '../Panes/Tooltip';
import dfstyles from '../Styles/dfstyles';
import { useAccount, usePlanetInactiveArtifacts, useUIManager } from '../Utils/AppHooks';
import { useEmitterValue } from '../Utils/EmitterHooks';
import { useOnUp } from '../Utils/KeyEmitters';
import { TOGGLE_ABANDON, TOGGLE_SEND, TOGGLE_WITHDRAW } from '../Utils/ShortcutConstants';
import { SelectArtifactRow } from './ArtifactRow';
import { SelectSpaceshipRow } from './SpaceshipRow';

const StyledSendResources = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StyledShowPercent = styled.div`
  display: inline-block;
  min-width: 35px;

  & > span:first-child {
    width: 3em;
    text-align: right;
    margin-right: 0.5em;
  }

  & > span:last-child {
    color: ${dfstyles.colors.subtext};
    & > span {
      ${dfstyles.prefabs.noselect};
      &:hover {
        color: ${dfstyles.colors.text};
        cursor: pointer;
      }
      &:first-child {
        margin-right: 0.5em;
      }
    }
  }
`;
function ShowPercent({ value, setValue }: { value: number; setValue: (x: number) => void }) {
  return (
    <StyledShowPercent>
      {/* <span>{value}%</span> */}
      <span style={{ width: '100%' }}>
        <span onClick={() => setValue(value - 1)}>
          <LongDash />
        </span>
        <span onClick={() => setValue(value + 1)}>+</span>
      </span>
    </StyledShowPercent>
  );
}

const ResourceRowDetails = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`;

function ResourceBar({
  isSilver,
  selected,
  value,
  setValue,
  disabled,
}: {
  isSilver?: boolean;
  selected: Planet | undefined;
  value: number;
  setValue: (x: number) => void;
  disabled?: boolean;
}) {
  const getResource = useCallback(
    (val: number) => {
      if (!selected) return '';
      const resource = isSilver ? selected.silver : selected.energy;
      return formatNumber((val / 100) * resource);
    },
    [selected, isSilver]
  );

  return (
    <>
      {isSilver ? (
        <Row>
          <Btn size='stretch'>Extract {getResource(value)} silver</Btn>
        </Row>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <ResourceRowDetails>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Icon type={isSilver ? IconType.Silver : IconType.Energy} />
              {getResource(value)}
              <Subber>
                {' '}
                ({value}%) {isSilver ? 'silver' : 'energy'}
              </Subber>
            </div>
            <ShowPercent value={value} setValue={setValue} />
          </ResourceRowDetails>

          <Slider
            variant='filled'
            labelVisibility='none'
            min={0}
            max={100}
            value={value}
            step={1}
            disabled={disabled}
            onChange={(e: Event & React.ChangeEvent<HTMLInputElement>) => {
              setValue(parseInt(e.target.value, 10));
            }}
          />
        </div>
      )}
    </>
  );
}

function AbandonButton({
  planet,
  abandoning,
  toggleAbandoning,
  disabled,
}: {
  planet?: Planet;
  abandoning: boolean;
  toggleAbandoning: () => void;
  disabled?: boolean;
}) {
  const uiManager = useUIManager();

  if (!planet) return null;

  let junk = uiManager.getDefaultSpaceJunkForPlanetLevel(planet?.planetLevel);
  if (planet.bonus[StatIdx.SpaceJunk]) junk /= 2;
  /* Explicitly avoid binding to `onShortcutPressed` so we can support sending on subpanes */
  return (
    <MaybeShortcutButton
      size='stretch'
      active={abandoning}
      onClick={toggleAbandoning}
      shortcutKey={TOGGLE_ABANDON}
      shortcutText={TOGGLE_ABANDON}
      disabled={planet.isHomePlanet || disabled}
    >
      <TooltipTrigger name={TooltipName.Abandon}>
        {abandoning ? 'Abandoning' : `Abandon Planet (-${junk}) space junk`}
      </TooltipTrigger>
    </MaybeShortcutButton>
  );
}

function ExtractButton({
  planet,
  extracting,
  disabled,
}: {
  planet?: Planet;
  extracting: boolean;
  disabled?: boolean;
}) {
  const uiManager = useUIManager();

  if (!planet) return null;

  const silver = planet.silver;

  return (
    <MaybeShortcutButton
      size='stretch'
      active={extracting}
      onClick={() => uiManager.withdrawSilver(planet.locationId)}
      shortcutKey={TOGGLE_WITHDRAW}
      shortcutText={TOGGLE_WITHDRAW}
      disabled={planet.isHomePlanet || disabled}
    >
      {/* <TooltipTrigger name={TooltipName.Abandon}> */}
      {extracting ? 'Extracting' : `Extract all (${Math.floor(silver)}) silver`}
      {/* </TooltipTrigger> */}
    </MaybeShortcutButton>
  );
}

function SendRow({
  toggleSending,
  artifact,
  spaceship,
  sending,
  abandoning,
  disabled = false,
}: {
  toggleSending: () => void;
  artifact: Artifact | undefined;
  spaceship: Spaceship | undefined;
  sending: boolean;
  abandoning?: boolean;
  disabled?: boolean;
}) {
  let content = 'Send';
  if (artifact) {
    const artifactName = nameOfArtifact(artifact);
    // Only add the "+" if we are sending Energy & Artifact
    content += ` + ${artifactName}`;
  }
  if (abandoning) {
    content += ' and Abandon';
  }
  // Spaceship overrides everything
  if (spaceship) {
    const spaceshipName = nameOfSpaceship(spaceship);
    // Call it "Move" with a spaceship, instead of "Send"
    content = `Move ${spaceshipName}`;
  }
  /* Explicitly avoid binding to `onShortcutPressed` so we can support sending on subpanes */
  return (
    <MaybeShortcutButton
      size='stretch'
      onClick={toggleSending}
      active={sending}
      shortcutKey={TOGGLE_SEND}
      shortcutText={TOGGLE_SEND}
      disabled={disabled}
    >
      {content}
    </MaybeShortcutButton>
  );
}

export function SendResources({
  planetWrapper: p,
  onToggleSendForces,
  onToggleAbandon,
}: {
  planetWrapper: Wrapper<Planet | undefined>;
  onToggleSendForces: () => void;
  onToggleAbandon: () => void;
}) {
  const uiManager = useUIManager();
  const account = useAccount(uiManager);
  const owned = p.value?.owner === account;
  const locationId = p?.value?.locationId;

  const isSendingShip = uiManager.isSendingShip(locationId);

  const isAbandoning = useEmitterValue(uiManager.isAbandoning$, false);
  const isExtracting = false;

  const isSendingForces = useEmitterValue(uiManager.isSending$, false);
  const energySending = uiManager.getForcesSending(locationId);
  const silverSending = 100;
  const artifactSending = uiManager.getArtifactSending(locationId);
  const spaceshipSending = uiManager.getSpaceshipSending(locationId);

  const disableSliders = isSendingShip || isAbandoning;

  const updateEnergySending = useCallback(
    (energyPercent) => {
      if (!locationId) return;
      uiManager.setForcesSending(locationId, energyPercent);
    },
    [uiManager, locationId]
  );
  const updateArtifactSending = useCallback(
    (sendArtifact) => {
      if (!locationId) return;
      uiManager.setArtifactSending(locationId, sendArtifact);
    },
    [uiManager, locationId]
  );
  const updateSpaceshipSending = useCallback(
    (sendSpaceship) => {
      if (!locationId) return;
      uiManager.setSpaceshipSending(locationId, sendSpaceship);
    },
    [uiManager, locationId]
  );

  // this variable is an array of 10 elements. each element is a key. whenever the user presses a
  // key, we set the amount of energy that we're sending to be proportional to how late in the array
  // that key is
  const energyShortcuts = '1234567890'.split('');

  // for each of the above keys, we set up a listener that is triggered whenever that key is
  // pressed, and sets the corresponding resource sending amount
  for (let i = 0; i < energyShortcuts.length; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useOnUp(energyShortcuts[i], () => updateEnergySending((i + 1) * 10), [updateEnergySending]);
  }

  useOnUp(
    '-',
    () => {
      updateEnergySending(uiManager.getForcesSending(locationId) - 10);
    },
    [uiManager, locationId, updateEnergySending]
  );
  useOnUp(
    '=',
    () => {
      updateEnergySending(uiManager.getForcesSending(locationId) + 10);
    },
    [uiManager, locationId, updateEnergySending]
  );

  const artifacts = usePlanetInactiveArtifacts(p);

  let abandonRow;
  if (p.value && p.value.transactions?.hasTransaction(isUnconfirmedReleaseTx)) {
    abandonRow = (
      <Btn size='stretch' disabled>
        <LoadingSpinner initialText='Abandoning...' />
      </Btn>
    );
  } else if (p.value && !p.value.destroyed) {
    abandonRow = (
      <AbandonButton
        planet={p.value}
        abandoning={isAbandoning && !isSendingShip}
        toggleAbandoning={onToggleAbandon}
        disabled={isSendingShip}
      />
    );
  }

  let sendRow;
  if (p.value && p.value.transactions?.hasTransaction(isUnconfirmedMoveTx)) {
    sendRow = (
      <Btn size='stretch' disabled>
        <LoadingSpinner initialText={isSendingShip ? 'Moving...' : 'Sending...'} />
      </Btn>
    );
  } else {
    const isDisabled = (p.value?.destroyed || !owned) && !isSendingShip;
    sendRow = (
      <SendRow
        artifact={artifactSending}
        spaceship={spaceshipSending}
        toggleSending={onToggleSendForces}
        sending={isSendingForces}
        disabled={isDisabled}
      />
    );
  }

  let extractRow;
  if (p.value && p.value.transactions?.hasTransaction(isUnconfirmedWithdrawSilverTx)) {
    extractRow = (
      <Btn size='stretch' disabled>
        <LoadingSpinner initialText='Extracting...' />
      </Btn>
    );
  } else if (p.value && !p.value.destroyed) {
    extractRow = (
      <ExtractButton planet={p.value} extracting={isExtracting} disabled={isExtracting} />
    );
  }

  return (
    <StyledSendResources>
      {owned && !p.value?.destroyed && (
        <>
          <ResourceBar
            selected={p.value}
            value={energySending}
            setValue={updateEnergySending}
            disabled={disableSliders}
          />
        </>
      )}

      {p.value && artifacts.length > 0 && (
        <SelectArtifactRow
          artifacts={artifacts}
          onArtifactChange={updateArtifactSending}
          selectedArtifact={artifactSending}
        />
      )}
      {p.value && p.value.spaceships.length > 0 && (
        <SelectSpaceshipRow
          spaceships={p.value.spaceships}
          onSpaceshipChange={updateSpaceshipSending}
          selectedSpaceship={spaceshipSending}
        />
      )}
      {isSendingShip || owned ? sendRow : null}

      {p.value && p.value.silver > 0 && extractRow}

      {uiManager.getSpaceJunkEnabled() && owned ? abandonRow : null}
    </StyledSendResources>
  );
}
