import { spaceshipFileName } from '@dfdao/gamelogic';
import { Spaceship } from '@dfdao/types';
import React from 'react';
import styled, { css } from 'styled-components';
import dfstyles from '../Styles/dfstyles';

export const SPACESHIP_URL = 'https://d2wspbczt15cqu.cloudfront.net/v0.6.0-artifacts/';

function getSpaceshipUrl(spaceship: Spaceship): string {
  const fileName = spaceshipFileName(spaceship);
  return SPACESHIP_URL + fileName;
}

export function SpaceshipImage({ spaceship, size }: { spaceship: Spaceship; size: number }) {
  const url = getSpaceshipUrl(spaceship);

  return (
    <Container width={size} height={size}>
      <img width={size} height={size} src={url} />
    </Container>
  );
}

const Container = styled.div`
  image-rendering: crisp-edges;

  ${({ width, height }: { width: number; height: number }) => css`
    width: ${width}px;
    height: ${height}px;
    min-width: ${width}px;
    min-height: ${height}px;
    background-color: ${dfstyles.colors.artifactBackground};
    display: inline-block;
  `}
`;
