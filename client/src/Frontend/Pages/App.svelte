<script lang="ts">
  import { CONTRACT_ADDRESS } from '@dfdao/contracts';
  import { address } from '@dfdao/serde';
  import Router from 'svelte-spa-router';
  import GameLandingPage from './GameLandingPage.svelte';
  import LandingPage from './LandingPage.svelte';

  const defaultAddress = address(CONTRACT_ADDRESS);

  const routes = {
    '/play/:contract': GameLandingPage,
    // '/play': // redirect to default address
    '/': LandingPage,
  };
</script>

<!-- Provides theming for WebComponents from the `@dfdao/ui` package -->
<df-theme color="dark" scale="medium">
  <Router {routes} />
</df-theme>

<style>
  :global(body) {
    width: 100vw;
    min-height: 100vh;
    background-color: var(--df-colors-background);
  }
</style>
