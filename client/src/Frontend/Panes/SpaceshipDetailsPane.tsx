import { spaceshipName } from '@dfdao/procedural';
import { Spaceship, SpaceshipType } from '@dfdao/types';
import React from 'react';
import styled from 'styled-components';
import { Spacer } from '../Components/CoreUI';
import { SpaceshipTypeText } from '../Components/Labels/SpaceshipLabels';
import { ReadMore } from '../Components/ReadMore';
import { SpaceshipImage } from '../Components/SpaceshipImage';
import { Red, Text } from '../Components/Text';
import { TextPreview } from '../Components/TextPreview';
import dfstyles from '../Styles/dfstyles';

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

const SpaceshipName = styled.div`
  color: ${dfstyles.colors.text};
  font-weight: bold;
`;

const SpaceshipNameSubtitle = styled.div`
  color: ${dfstyles.colors.subtext};
  margin-bottom: 8px;
`;

export function SpaceshipDetailsHelpContent() {
  return (
    <div>
      <p>In this pane, you can see specific information about a particular spaceship.</p>
    </div>
  );
}

export function SpaceshipDetailsBody({ spaceship }: { spaceship: Spaceship }) {
  return (
    <>
      <div style={{ display: 'inline-block' }}>
        <SpaceshipImage spaceship={spaceship} size={32} />
      </div>
      <Spacer width={8} />
      <div style={{ display: 'inline-block' }}>
        <SpaceshipName>{spaceshipName(spaceship)}</SpaceshipName>
        <SpaceshipNameSubtitle>
          <SpaceshipTypeText spaceship={spaceship} />
        </SpaceshipNameSubtitle>
      </div>

      <StyledArtifactDetailsBody>
        <SpaceshipDescription spaceship={spaceship} />
        <Spacer height={8} />

        <div className='row'>
          <span>ID</span>
          <TextPreview text={spaceship.id} />
        </div>
      </StyledArtifactDetailsBody>
    </>
  );
}

function SpaceshipDescription({
  spaceship,
  collapsable,
}: {
  spaceship: Spaceship;
  collapsable?: boolean;
}) {
  let content;

  const genericSpaceshipDescription = <>Can move between planets without sending energy.</>;

  switch (spaceship.spaceshipType) {
    case SpaceshipType.ShipMothership:
      content = (
        <Text>
          Doubles energy regeneration of the planet that it is currently on.{' '}
          {genericSpaceshipDescription}
        </Text>
      );
      break;
    case SpaceshipType.ShipCrescent:
      content = (
        <Text>
          Activate to convert an un-owned planet whose level is more than 0 into an Asteroid Field.{' '}
          <Red>Can only be used once.</Red> {genericSpaceshipDescription}
        </Text>
      );
      break;
    case SpaceshipType.ShipGear:
      content = (
        <Text>
          Allows you to prospect planets, and subsequently find artifacts on them.{' '}
          {genericSpaceshipDescription}
        </Text>
      );
      break;
    case SpaceshipType.ShipTitan:
      content = (
        <Text>
          Pauses energy and silver regeneration on the planet it's on. {genericSpaceshipDescription}
        </Text>
      );
      break;
    case SpaceshipType.ShipWhale:
      content = (
        <Text>
          Doubles the silver regeneration of the planet that it is currently on.{' '}
          {genericSpaceshipDescription}
        </Text>
      );
      break;
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
