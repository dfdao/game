<script lang="ts">
  import { CONTRACT_ADDRESS } from '@dfdao/contracts';
  import { address } from '@dfdao/serde';
  import { push } from 'svelte-spa-router';
  import IconLink from '../Components/IconLink.svelte';
  import Link from '../Components/Link.svelte';
  import LandingPageRoundArt from '../Views/LandingPageRoundArt.svelte';

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
</script>

<div class="PrettyOverlayGradient" />
<div class="Page">
  <div class="MainContentContainer">
    <div class="Header">
      <div class="LinkContainer">
        <Link to={links.email} openNewTab>email</Link>
        <Link to={links.blog} openNewTab>blog</Link>
        <IconLink to={links.twitter} icon="twitter" />
        <IconLink to={links.discord} icon="discord" />
        <IconLink to={links.github} icon="github" />
        <Link to={links.plugins} openNewTab>plugins</Link>
        <Link to={links.wiki} openNewTab>wiki</Link>
      </div>

      <LandingPageRoundArt />

      <p>
        <span class="White">Dark Forest</span>
        <span class="Text">zkSNARK space warfare</span>
        <br />
        <span class="Text">Round 5:</span>
        <span class="White">The Junk Wars</span>
      </p>

      <div class="ButtonWrapper">
        <df-button size="large" on:click={() => push(`/lobby/${defaultAddress}`)}
          >Create Lobby</df-button
        >
        <df-button size="large" on:click={() => push(`/play/${defaultAddress}`)}
          >Enter Round 5</df-button
        >
        <df-button size="large" on:click={() => push(`/events`)}>Events</df-button>
      </div>
    </div>

    Ways to get Involved

    <div class="Involved">
      <a
        class="InvolvedItem"
        href="https://blog.zkga.me/hosting-a-dark-forest-community-round"
        style:background-image="url('/get_involved/community_round.png')"
      />
      <a
        class="InvolvedItem"
        href="https://github.com/darkforest-eth/plugins#adding-your-plugin"
        style:background-image="url('/get_involved/write_plugin.png')"
      />
      <a
        class="InvolvedItem"
        href="https://github.com/darkforest-eth/plugins#reviewer-guidelines"
        style:background-image="url('/get_involved/reveiw_plugin.png')"
      />
      <a
        class="InvolvedItem"
        href="https://blog.zkga.me/renderer-plugin-contest"
        style:background-image="url('/get_involved/plugin_render.png')"
      />
      <a
        class="InvolvedItem"
        href="https://blog.zkga.me/introducing-dark-forest-lobbies"
        style:background-image="url('/get_involved/lobby.png')"
      />
    </div>
  </div>
</div>

<style>
  .PrettyOverlayGradient {
    width: 100vw;
    height: 100vh;
    background: linear-gradient(to left top, rgba(74, 74, 74, 0.628), rgba(60, 1, 255, 0.2)) fixed;
    background-position: 50%, 50%;
    display: inline-block;
    position: fixed;
    top: 0;
    left: 0;
    z-index: -1;
  }

  .Page {
    position: absolute;
    width: 100vw;
    max-width: 100vw;
    height: 100%;
    color: white;
    font-size: var(--df-font-size);
    display: flex;
    flex-direction: column;
    align-items: center;
    /* did this need to be a variable? */
    z-index: 2;

    /* Fuck spacers */
    margin-top: 150px;
  }

  .MainContentContainer {
    max-width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }

  .Header {
    text-align: center;

    /* Fuck spacers */
    margin-bottom: 3em;
  }

  .LinkContainer {
    display: flex;
    justify-content: center;
    align-items: center;

    /* Fuck spacers */
    margin-bottom: 16px;
    column-gap: 20px;
  }

  .ButtonWrapper {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-direction: row;

    /* Fuck spacers */
    margin-top: 16px;

    --df-button-color: var(--df-colors-dfgreen);
    --df-button-border: 1px solid var(--df-colors-dfgreen);
    --df-button-hover-background: var(--df-colors-dfgreen);
    --df-button-hover-border: 1px solid var(--df-colors-dfgreen);
  }

  .Involved {
    width: 100%;
    padding-left: 16px;
    padding-right: 16px;
    display: grid;
    grid-template-columns: auto auto;
    gap: 10px;
    grid-auto-rows: minmax(100px, auto);

    /* Fuck spacers */
    margin-top: 1em;
    margin-bottom: 3em;
  }

  .InvolvedItem {
    height: 150px;
    display: inline-block;
    margin: 4px;
    padding: 4px 8px;

    background-color: var(--df-colors-backgroundlighter);
    background-size: cover;
    background-position: 50% 50%;
    background-repeat: no-repeat;

    cursor: pointer;
    transition: transform 200ms;
  }
  .InvolvedItem:hover,
  .InvolvedItem:active {
    transform: scale(1.03);
  }

  @media only screen and (max-device-width: 1000px) {
    .Page {
      /* Fuck spacers */
      margin-top: 8px;
    }

    .LinkContainer {
      /* Fuck spacers */
      margin-bottom: 4px;
    }

    .ButtonWrapper {
      grid-template-columns: auto;
      flex-direction: column;
    }

    .Involved {
      grid-template-columns: auto;
    }
  }

  .White {
    color: var(--df-colors-dfwhite);
  }
  .Text {
    color: var(--df-colors-text);
  }
</style>
