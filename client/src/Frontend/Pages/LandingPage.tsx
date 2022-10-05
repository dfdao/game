import { CONTRACT_ADDRESS } from '@dfdao/contracts';
import { address } from '@dfdao/serde';
import React from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Btn } from '../Components/Btn';
import { EmSpacer, Link, Spacer, Title } from '../Components/CoreUI';
import { Modal } from '../Components/Modal';
import dfstyles from '../Styles/dfstyles';

export const enum LandingPageZIndex {
  Background = 0,
  Canvas = 1,
  BasePage = 2,
}

const links = {
  twitter: 'http://twitter.com/darkforest_eth',
  email: 'mailto:ivan@0xparc.org',
  blog: 'https://blog.zkga.me/',
  discord: 'https://discord.gg/2u2TN6v8r6',
  github: 'https://github.com/darkforest-eth',
  wiki: 'https://dfwiki.net/wiki/Main_Page',
  plugins: 'https://plugins.zkga.me/',
};

const defaultAddress = address(CONTRACT_ADDRESS);

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-direction: row;

  @media only screen and (max-device-width: 1000px) {
    grid-template-columns: auto;
    flex-direction: column;
  }

  --df-button-color: ${dfstyles.colors.dfgreen};
  --df-button-border: 1px solid ${dfstyles.colors.dfgreen};
  --df-button-hover-background: ${dfstyles.colors.dfgreen};
  --df-button-hover-border: 1px solid ${dfstyles.colors.dfgreen};
`;

export default function LandingPage() {
  const history = useHistory();

  return (
    <>
      <PrettyOverlayGradient />
      {/* <Hiring /> */}

      <Page>
        <OnlyMobile>
          <Spacer height={8} />
        </OnlyMobile>
        <HideOnMobile>
          <Spacer height={150} />
        </HideOnMobile>

        <MainContentContainer>
          <Header>
            <ButtonWrapper>
              <Btn size='large' onClick={() => history.push(`/play/${defaultAddress}`)}>
                Play
              </Btn>
            </ButtonWrapper>
          </Header>
          <EmSpacer height={3} />
        </MainContentContainer>
      </Page>
    </>
  );
}

const PrettyOverlayGradient = styled.div`
  width: 100vw;
  height: 100vh;
  background: linear-gradient(to left top, rgba(74, 74, 74, 0.628), rgba(60, 1, 255, 0.2)) fixed;
  background-position: 50%, 50%;
  display: inline-block;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
`;

const Header = styled.div`
  text-align: center;
`;

const EmailWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const TRow = styled.tr`
  & td:first-child {
    color: ${dfstyles.colors.subtext};
  }
  & td:nth-child(2) {
    padding-left: 12pt;
  }
  & td:nth-child(3) {
    text-align: right;
    padding-left: 16pt;
  }
`;

const MainContentContainer = styled.div`
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
`;

const Page = styled.div`
  position: absolute;
  width: 100vw;
  max-width: 100vw;
  height: 100%;
  color: white;
  font-size: ${dfstyles.fontSize};
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: ${LandingPageZIndex.BasePage};
`;

const HallOfFameTitle = styled.div`
  color: ${dfstyles.colors.subtext};
  display: inline-block;
  border-bottom: 1px solid ${dfstyles.colors.subtext};
  line-height: 1em;
`;

export const LinkContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  a {
    margin: 0 6pt;
    transition: color 0.2s;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
      cursor: pointer;
      &.link-twitter {
        color: ${dfstyles.colors.icons.twitter};
      }
      &.link-github {
        color: ${dfstyles.colors.icons.github};
      }
      &.link-discord {
        color: ${dfstyles.colors.icons.discord};
      }
      &.link-blog {
        color: ${dfstyles.colors.icons.blog};
      }
      &.link-email {
        color: ${dfstyles.colors.icons.email};
      }
    }
  }
`;

function Hiring() {
  return (
    <HideOnMobile>
      <Modal contain={['top', 'left', 'right']} initialX={50} initialY={50}>
        <Title slot='title'>Dark Forest is Hiring!</Title>
        <div style={{ maxWidth: '300px', textAlign: 'justify' }}>
          We are looking for experienced full stack and solidity developers to join our team! If you
          like what you see,{' '}
          <Link to='https://docs.google.com/forms/d/e/1FAIpQLSdaWvjxX4TrDDLidPXtgk6UW3rC082rpvi3AIPkCPxAahg_rg/viewform?usp=sf_link'>
            consider applying
          </Link>
          . If you know someone who you think would be a great fit for our team,{' '}
          <Link to='https://docs.google.com/forms/d/e/1FAIpQLScku_bQDbkPqpHrwBzOBfQ4SV6Nw6Tgxi6zWQL8Bb0olyBE3w/viewform?usp=sf_link'>
            please refer them here
          </Link>
          .
          <br />
          <br />
          Learn more about the role{' '}
          <Link to='https://ivanchub.notion.site/Dark-Forest-is-Hiring-ad1f0cbe816640fb9b4c663dacaaca04'>
            here
          </Link>
          .
        </div>
      </Modal>
    </HideOnMobile>
  );
}

const HideOnMobile = styled.div`
  @media only screen and (max-device-width: 1000px) {
    display: none;
  }
`;

const OnlyMobile = styled.div`
  @media only screen and (min-device-width: 1000px) {
    display: none;
  }
`;

const Involved = styled.div`
  width: 100%;
  padding-left: 16px;
  padding-right: 16px;
  display: grid;
  grid-template-columns: auto auto;
  gap: 10px;
  grid-auto-rows: minmax(100px, auto);

  @media only screen and (max-device-width: 1000px) {
    grid-template-columns: auto;
  }
`;

const InvolvedItem = styled.a`
  height: 150px;
  display: inline-block;
  margin: 4px;
  padding: 4px 8px;

  background-color: ${dfstyles.colors.backgroundlighter};
  background-size: cover;
  background-position: 50% 50%;
  background-repeat: no-repeat;

  cursor: pointer;
  transition: transform 200ms;
  &:hover {
    transform: scale(1.03);
  }
  &:hover:active {
    transform: scale(1.05);
  }
`;

const HallOfFame = styled.div`
  @media only screen and (max-device-width: 1000px) {
    font-size: 70%;
  }
`;
