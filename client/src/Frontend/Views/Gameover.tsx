import { EthAddress, TooltipName } from '@dfdao/types';
import React from 'react';
import styled from 'styled-components';
import { AccountLabel } from '../Components/Labels/Labels';
import { Gold } from '../Components/Text';
import { TooltipTrigger } from '../Panes/Tooltip';
import { useGameover, useUIManager } from '../Utils/AppHooks';

export function Gameover() {
  const uiManager = useUIManager();
  const winners = uiManager.getWinners();
  const gameover = useGameover();
  const teamsEnabled = false;
  const winningTeam = '';

  if (!gameover) {
    return <></>;
  }

  return (
    <>
      <GameoverContainer>
        <TooltipTrigger
          extraContent={
            <>GAMEOVER! The winner is {teamsEnabled ? `Team ${winningTeam}` : winners[0]}</>
          }
          name={TooltipName.Empty}
        >
          <Gold>GAMEOVER!</Gold>
          <br />
          Winner:{' '}
          {teamsEnabled ? (
            `Team ${winningTeam}`
          ) : (
            <AccountLabel ethAddress={winners[0] as EthAddress} />
          )}
        </TooltipTrigger>
      </GameoverContainer>
    </>
  );
}

const GameoverContainer = styled.div`
  font-size: 2em;
  text-align: center;
`;
