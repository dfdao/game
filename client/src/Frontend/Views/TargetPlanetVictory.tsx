import { TooltipName } from '@dfdao/types';
import React, { useState } from 'react';
import styled from 'styled-components';
import TutorialManager, { TutorialState } from '../../Backend/GameLogic/TutorialManager';
import { ContractsAPIEvent } from '../../_types/darkforest/api/ContractsAPITypes';
import { Green, Red } from '../Components/Text';
import { TooltipTrigger } from '../Panes/Tooltip';
import { useGameover, useUIManager } from '../Utils/AppHooks';

export function TargetPlanetVictory() {
  const uiManager = useUIManager();
  const gameManager = uiManager.getGameManager();
  const canClaimVictory = gameManager.checkVictoryCondition();
  console.log(`can claim victory`, canClaimVictory);
  const gameover = useGameover();
  const [claiming, setClaiming] = useState(false);

  const player = uiManager.getAccount();
  if (!player) return <></>;
  const requiredPlanets = uiManager.contractConstants.TARGETS_REQUIRED_FOR_VICTORY;
  const requiredEnergy = uiManager.contractConstants.CLAIM_VICTORY_ENERGY_PERCENT;

  async function handleClaimVictory() {
    setClaiming(true);
    try {
      const tx = await gameManager.claimVictory();
      const res = await tx.confirmedPromise;
      // Manual emit just to be sure
      uiManager.getGameManager().getContractAPI().emit(ContractsAPIEvent.PlayerUpdate, player);
      // uiManager.getGameManager().getContractAPI().emit(ContractsAPIEvent.Gameover);
    } catch (error) {
      setClaiming(false);
    }
  }

  if (gameover) {
    return <></>;
  }
  return (
    <>
      <GameoverContainer>
        <TooltipTrigger
          extraContent={
            <>
              In this game, you need to capture <Red>{requiredPlanets}</Red> target planet
              {requiredPlanets !== 1 && 's'} and fill each with{' '}
              <Green>{requiredEnergy}% energy</Green>. Then you can claim victory and win the game!
            </>
          }
          name={TooltipName.Empty}
          style={{ gap: '5px' }}
        >
          <span style={{ marginInline: '5px' }}>
            Targets: {gameManager.getTargetsHeld().length}/{requiredPlanets}
          </span>

          {canClaimVictory && (
            <LobbyButton
              primary
              disabled={claiming}
              onClick={() => {
                const tutorialManager = TutorialManager.getInstance(this);
                tutorialManager.acceptInput(TutorialState.HowToGetScore);
                handleClaimVictory();
              }}
            >
              {claiming ? 'Claiming...' : 'Claim Victory'!}
            </LobbyButton>
          )}
        </TooltipTrigger>
      </GameoverContainer>
      {/* <TimeContainer>Game length: {prettyTime(gameDuration)}</TimeContainer> */}
    </>
  );
}

const GameoverContainer = styled.div`
  // font-size: 2em;
  text-align: center;
`;
const TimeContainer = styled.div`
  font-size: 1em;
  text-align: center;
`;

export const LobbyButton = styled.button<{ primary?: boolean }>`
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: ${({ primary }) => (primary ? '2px solid #2EE7BA' : '1px solid #5F5F5F')};
  color: ${({ primary }) => (primary ? '#2EE7BA' : '#fff')};
  background: ${({ primary }) => (primary ? '#09352B' : '#252525')};
  padding: 16px;
  border-radius: 4px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background 80ms ease 0s, border-color;
  &:hover:not([disabled]) {
    background: ${({ primary }) => (primary ? '#0E5141' : '#3D3D3D')};
    border-color: ${({ primary }) => (primary ? '#30FFCD' : '#797979')};
  }
  &:disabled {
    cursor: not-allowed;
    background: #0e5141;
    border-color: transparent;
  }
`;
