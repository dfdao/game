<script lang="ts">
  import { loadDiamondContract, makeConnection } from '../../Backend/Network/Blockchain';
  import dfstyles from '../Styles/dfstyles';
  import { Incompatibility, unsupportedFeatures } from '../Utils/BrowserChecks';
  import Terminal, {
    println,
    print,
    newline,
    printComponent,
    prompt,
    clear,
  } from '../Views/Terminal.svelte';
  import { address } from '@dfdao/serde';
  import { CONTRACT_ADDRESS } from '@dfdao/contracts';
  import Link from '../Components/Link.svelte';
  import MythicLabel from '../Components/Labels/MythicLabel.svelte';
  import TextPreview from '../Components/TextPreview.svelte';
  import { addAccount, getAccounts } from '../../Backend/Network/AccountManager';
  import { querystring, push } from 'svelte-spa-router';
  import { writable } from 'svelte/store';
  import { utils, Wallet } from 'ethers';
  import { ContractManager } from '@projectsophon/network';
  import type { DarkForest } from '@dfdao/contracts/typechain';
  import { EmailResponse, submitInterestedEmail } from '../../Backend/Network/UtilityServerAPI';
  import { bigIntFromKey } from '@dfdao/whitelist';
  import { getWhitelistArgs } from '../../Backend/Utils/WhitelistSnarkArgsHelper';
  import { BLOCK_EXPLORER_URL } from '@dfdao/constants';

  export let params: { contract?: string } = {};

  let ethConnection = makeConnection();

  let contracts = new ContractManager(ethConnection);

  $: contractAddress = address(params.contract || CONTRACT_ADDRESS);

  $: isLobby = params.contract !== address(CONTRACT_ADDRESS);

  type TerminalPromptStep = {
    type:
      | 'COMPATIBILITY'
      | 'INTRODUCTION'
      | 'ACCOUNT_SELECTION'
      | 'DISPLAY_ACCOUNTS'
      | 'GENERATE_ACCOUNT'
      | 'IMPORT_ACCOUNT'
      | 'ACCOUNT_SET'
      | 'ASKING_HAS_WHITELIST_KEY'
      | 'ASKING_WAITLIST_EMAIL'
      | 'ASKING_WHITELIST_KEY'
      | 'ASKING_PLAYER_EMAIL'
      | 'FETCHING_ETH_DATA'
      | 'ASK_ADD_ACCOUNT'
      | 'ADD_ACCOUNT'
      | 'NO_HOME_PLANET'
      | 'SEARCHING_FOR_HOME_PLANET'
      | 'ALL_CHECKS_PASS'
      | 'COMPLETE'
      | 'TERMINATED'
      | 'ERROR';
  };

  // These use an object to avoid Svelte's logic that doesn't run subscriptions
  // if the previous value and new value are the same
  let step = writable<TerminalPromptStep>({ type: 'COMPATIBILITY' });

  function setStep(type: TerminalPromptStep['type']) {
    $step = { type };
  }

  step.subscribe(({ type }) => {
    switch (type) {
      case 'COMPATIBILITY':
        return checkCompatibility();
      case 'INTRODUCTION':
        return showIntroduction();
      case 'ACCOUNT_SELECTION':
        return selectAccount();
      case 'DISPLAY_ACCOUNTS':
        return displayAccounts();
      case 'GENERATE_ACCOUNT':
        return generateAccount();
      case 'IMPORT_ACCOUNT':
        return importAccount();
      case 'ACCOUNT_SET':
        return validateAccount();
      case 'ASKING_HAS_WHITELIST_KEY':
        return checkHasWhitelistKey();
      case 'ASKING_WHITELIST_KEY':
        return requestWhitelistKey();
      case 'ASKING_WAITLIST_EMAIL':
        return requestWaitlistEmail();
      case 'ASKING_PLAYER_EMAIL':
        return requestPlayerEmail();
      case 'TERMINATED':
        return terminate();
    }
  });

  async function checkCompatibility() {
    console.log('running COMPAT');
    const issues = await unsupportedFeatures();

    if (issues.includes(Incompatibility.MobileOrTablet)) {
      println('ERROR: Mobile or tablet device detected. Please use desktop.', {
        color: dfstyles.colors.dfred,
      });
    }

    if (issues.includes(Incompatibility.NoIDB)) {
      println('ERROR: IndexedDB not found. Try using a different browser.', {
        color: dfstyles.colors.dfred,
      });
    }

    if (issues.includes(Incompatibility.UnsupportedBrowser)) {
      println('ERROR: Browser unsupported. Try Brave, Firefox, or Chrome.', {
        color: dfstyles.colors.dfred,
      });
    }

    if (issues.length > 0) {
      print(`${issues.length.toString()} errors found. `, { color: dfstyles.colors.dfred });
      println('Please resolve them and refresh the page.');
      // I **think** this should be error
      setStep('ERROR');
    } else {
      setStep('INTRODUCTION');
    }
  }

  async function showIntroduction() {
    console.log('running INTRO');
    if (isLobby) {
      newline();
      printComponent(MythicLabel, { text: 'You are joining a Dark Forest lobby' });
      newline();
      newline();
    } else {
      newline();
      newline();
      printComponent(MythicLabel, { text: '                 Dark Forest' });
      newline();
      newline();

      print('    ');
      print('Version', { color: dfstyles.colors.subtext });
      print('    ');
      print('Date', { color: dfstyles.colors.subtext });
      print('              ');
      print('Champion', { color: dfstyles.colors.subtext });
      newline();

      print('    v0.1       ', { color: dfstyles.colors.text });
      print('02/05/2020        ', { color: dfstyles.colors.text });
      printComponent(Link, { to: 'https://twitter.com/zoink', openNewTab: true }, 'Dylan Field');
      newline();
      print('    v0.2       ', { color: dfstyles.colors.text });
      println('06/06/2020        Nate Foss', { color: dfstyles.colors.text });
      print('    v0.3       ', { color: dfstyles.colors.text });
      print('08/07/2020        ', { color: dfstyles.colors.text });
      printComponent(
        Link,
        { to: 'https://twitter.com/hideandcleanse', openNewTab: true },
        '@hideandcleanse'
      );
      newline();
      print('    v0.4       ', { color: dfstyles.colors.text });
      print('10/02/2020        ', { color: dfstyles.colors.text });
      printComponent(
        Link,
        { to: 'https://twitter.com/jacobrosenthal', openNewTab: true },
        'Jacob Rosenthal'
      );
      newline();
      print('    v0.5       ', { color: dfstyles.colors.text });
      print('12/25/2020        ', { color: dfstyles.colors.text });
      printComponent(TextPreview, {
        text: '0xb05d95422bf8d5024f9c340e8f7bd696d67ee3a9',
        focusedWidth: '100px',
        unFocusedWidth: '100px',
      });
      newline();

      print('    v0.6 r1    ', { color: dfstyles.colors.text });
      print('05/22/2021        ', { color: dfstyles.colors.text });
      printComponent(
        Link,
        { to: 'https://twitter.com/adietrichs', openNewTab: true },
        'Ansgar Dietrichs'
      );
      newline();

      print('    v0.6 r2    ', { color: dfstyles.colors.text });
      print('06/28/2021        ', { color: dfstyles.colors.text });
      printComponent(Link, { to: 'https://twitter.com/orden_gg', openNewTab: true }, '@orden_gg');
      newline();

      print('    v0.6 r3    ', { color: dfstyles.colors.text });
      print('08/22/2021        ', { color: dfstyles.colors.text });
      printComponent(
        Link,
        { to: 'https://twitter.com/dropswap_gg', openNewTab: true },
        '@dropswap_gg'
      );
      newline();

      print('    v0.6 r4    ', { color: dfstyles.colors.text });
      print('10/01/2021        ', { color: dfstyles.colors.text });
      printComponent(Link, { to: 'https://twitter.com/orden_gg', openNewTab: true }, '@orden_gg');
      newline();

      print('    v0.6 r5    ', { color: dfstyles.colors.text });
      print('02/18/2022        ', { color: dfstyles.colors.text });
      printComponent(Link, { to: 'https://twitter.com/d_fdao', openNewTab: true }, '@d_fdao');
      print(' + ');
      printComponent(Link, { to: 'https://twitter.com/orden_gg', openNewTab: true }, '@orden_gg');
      newline();
      newline();
    }

    setStep('ACCOUNT_SELECTION');
  }

  async function selectAccount() {
    console.log('running SELECT');

    const search = new URLSearchParams($querystring);
    const selectedAddress = search.get('account');
    // TODO: Async / store API
    const accounts = getAccounts();
    println(`Found ${accounts.length} accounts on this device.`);
    newline();

    if (accounts.length > 0) {
      print('(a) ', { color: dfstyles.colors.subtext });
      println('Login with existing account.');
    }

    print('(n) ', { color: dfstyles.colors.subtext });
    println(`Generate new burner wallet account.`);
    print('(i) ', { color: dfstyles.colors.subtext });
    println(`Import private key.`);
    newline();
    println(`Select an option:`, { color: dfstyles.colors.text });

    if (selectedAddress !== null) {
      println(`Selecting account ${selectedAddress} from url...`, {
        color: dfstyles.colors.dfgreen,
      });

      const account = accounts.find((a) => a.address === selectedAddress);
      if (account) {
        try {
          ethConnection.privateKey = account.privateKey;
          setStep('ACCOUNT_SET');
        } catch (e) {
          println('An unknown error occurred. please try again.', { color: dfstyles.colors.dfred });
          setStep('ERROR');
        }
      } else {
        println('Unrecognized account found in url.', { color: dfstyles.colors.dfred });
        setStep('ERROR');
      }
    } else {
      prompt((userInput) => {
        if (userInput === 'a' && accounts.length > 0) {
          setStep('DISPLAY_ACCOUNTS');
        } else if (userInput === 'n') {
          setStep('GENERATE_ACCOUNT');
        } else if (userInput === 'i') {
          setStep('IMPORT_ACCOUNT');
        } else {
          println('Unrecognized input. Please try again.');
          newline();
          setStep('ACCOUNT_SELECTION');
        }
      });
    }
  }

  async function displayAccounts() {
    newline();
    const accounts = getAccounts();
    for (let i = 0; i < accounts.length; i += 1) {
      print(`(${i + 1}): `, { color: dfstyles.colors.subtext });
      println(`${accounts[i].address}`);
    }
    newline();
    println(`Select an account:`, { color: dfstyles.colors.text });

    prompt((userInput) => {
      const selection = +(userInput || '');
      if (isNaN(selection) || selection > accounts.length) {
        println('Unrecognized input. Please try again.');
        setStep('DISPLAY_ACCOUNTS');
      } else {
        const account = accounts[selection - 1];
        try {
          ethConnection.privateKey = account.privateKey;
          setStep('ACCOUNT_SET');
        } catch (e) {
          println('An unknown error occurred. please try again.', { color: dfstyles.colors.dfred });
          setStep('ERROR');
        }
      }
    });
  }

  async function generateAccount() {
    console.log('running GENERATE');
    const newWallet = Wallet.createRandom();
    const newAddr = address(newWallet.address);
    try {
      addAccount(newWallet.privateKey);
      ethConnection.privateKey = newWallet.privateKey;

      newline();
      print(`Created new burner wallet with address `);
      printComponent(TextPreview, {
        text: newAddr,
        unFocusedWidth: '100px',
      });
      newline();
      newline();
      println('Note: Burner wallets are stored in local storage.', { color: dfstyles.colors.text });
      println('They are relatively insecure and you should avoid ');
      println('storing substantial funds in them.');
      newline();
      println('Also, clearing browser local storage/cache will render your');
      println('burner wallets inaccessible, unless you export your private keys.');
      newline();
      println('Press any key to continue:', { color: dfstyles.colors.text });

      prompt(() => {
        setStep('ACCOUNT_SET');
      });
    } catch (e) {
      println('An unknown error occurred. please try again.', { color: dfstyles.colors.dfred });
      setStep('ERROR');
    }
  }

  async function importAccount() {
    println('Enter the 0x-prefixed private key of the account you wish to import', {
      color: dfstyles.colors.text,
    });
    println("NOTE: THIS WILL STORE THE PRIVATE KEY IN YOUR BROWSER'S LOCAL STORAGE", {
      color: dfstyles.colors.text,
    });
    println(
      'Local storage is relatively insecure. We recommend only importing accounts with zero-to-no funds.'
    );

    prompt((newSKey) => {
      try {
        const newAddr = address(utils.computeAddress(newSKey));

        addAccount(newSKey);

        ethConnection.privateKey = newSKey;
        println(`Imported account with address ${newAddr}.`);
        setStep('ACCOUNT_SET');
      } catch (e) {
        println('An unknown error occurred. please try again.', { color: dfstyles.colors.dfred });
        setStep('ERROR');
      }
    });
  }

  async function validateAccount() {
    if (!ethConnection.account) {
      println('No account selected', { color: dfstyles.colors.dfred });
      newline();
      setStep('ACCOUNT_SELECTION');

      return;
    }
    try {
      const contract = await contracts.loadContract<DarkForest>(
        contractAddress,
        loadDiamondContract
      );
      const isWhitelisted = await contract.isWhitelisted(ethConnection.account);

      newline();
      print('Checking if whitelisted... ');

      if (isWhitelisted) {
        println('Player whitelisted.');
        newline();
        println(`Welcome, player ${ethConnection.account}.`);
        // TODO: Provide own env variable for this feature
        //   if (import.meta.env.DEV) {
        //     // in development, automatically get some ether from faucet
        //     const balance = weiToEth(await ethConnection?.loadBalance(playerAddress));
        //     if (balance === 0) {
        //       await requestDevFaucet(playerAddress);
        //     }
        //   }
        setStep('FETCHING_ETH_DATA');
      } else {
        setStep('ASKING_HAS_WHITELIST_KEY');
      }
    } catch (e) {
      console.error(`error connecting to whitelist: ${e}`);
      println(
        'ERROR: Could not connect to whitelist contract. Please refresh and try again in a few minutes.',
        { color: dfstyles.colors.dfred }
      );
      setStep('TERMINATED');
    }
  }

  async function checkHasWhitelistKey() {
    print('Do you have a whitelist key?', { color: dfstyles.colors.text });
    println(' (y/n)');
    prompt((userInput) => {
      if (userInput === 'y') {
        setStep('ASKING_WHITELIST_KEY');
      } else if (userInput === 'n') {
        setStep('ASKING_WAITLIST_EMAIL');
      } else {
        println('Unrecognized input. Please try again.');
        newline();
        setStep('ASKING_HAS_WHITELIST_KEY');
      }
    });
  }

  async function requestWhitelistKey() {
    if (!ethConnection.account) {
      println('No account selected', { color: dfstyles.colors.dfred });
      newline();
      setStep('ACCOUNT_SELECTION');

      return;
    }

    println('Please enter your invite key (XXXXXX-XXXXXX-XXXXXX-XXXXXX):', {
      color: dfstyles.colors.subtext,
    });

    const account = ethConnection.account;
    const contract = await contracts.loadContract<DarkForest>(contractAddress, loadDiamondContract);

    prompt(async (key) => {
      print('Processing key... (this may take up to 30s)');
      newline();

      let keyBigInt;
      try {
        keyBigInt = bigIntFromKey(key);
      } catch (err) {
        println(`ERROR: Key ${key} is not valid.`, { color: dfstyles.colors.dfred });
        newline();
        setStep('ASKING_HAS_WHITELIST_KEY');

        return;
      }

      try {
        const start = Date.now();
        println('WHITELIST REGISTER: calculating witness and proof', {
          color: dfstyles.colors.subtext,
        });
        const snarkArgs = await getWhitelistArgs(keyBigInt, account);
        const end = Date.now();
        println(`WHITELIST REGISTER: calculated witness and proof in ${end - start}ms`, {
          color: dfstyles.colors.subtext,
        });

        const ukReceipt = await contract.useKey(...snarkArgs);
        await ukReceipt.wait();
        print('Successfully joined game. ', { color: dfstyles.colors.dfgreen });
        print('Welcome, player ');
        println(account, { color: dfstyles.colors.text });
        print('Sent player $0.15 :) ', { color: dfstyles.colors.dfblue });
        printComponent(
          Link,
          { to: `${BLOCK_EXPLORER_URL}/${ukReceipt.hash}`, color: dfstyles.colors.dfblue },
          '(View Transaction)'
        );
        newline();
        setStep('ASKING_PLAYER_EMAIL');
      } catch (e) {
        const error = e.error;
        console.error('Error whitelisting.', e);

        if (error instanceof Error) {
          const invalidKey = error.message.includes('invalid key');
          if (invalidKey) {
            println(`ERROR: Key ${key} is not valid.`, { color: dfstyles.colors.dfred });
            newline();
            setStep('ASKING_HAS_WHITELIST_KEY');

            return;
          }
        }
        println(`ERROR: Something went wrong.`, { color: dfstyles.colors.dfred });
        println('Press any key to try again.');
        prompt(() => {
          setStep('ASKING_WHITELIST_KEY');
        });
      }
    });
  }

  async function requestWaitlistEmail() {
    println('Enter your email address to sign up for the whitelist.', {
      color: dfstyles.colors.text,
    });
    prompt(async (email) => {
      const response = await submitInterestedEmail(email);
      if (response === EmailResponse.Success) {
        println('Email successfully recorded. ', { color: dfstyles.colors.dfgreen });
        println('Response pending...', { color: dfstyles.colors.subtext });
        println('Keep an eye out for updates and invite keys in the next few weeks.', {
          color: dfstyles.colors.subtext,
        });
        newline();
        setStep('TERMINATED'); // TODO: Terminated needs to prompt to return to homepage
      } else if (response === EmailResponse.Invalid) {
        println('Email invalid. Please try again.', { color: dfstyles.colors.dfred });
        newline();
        setStep('ASKING_WAITLIST_EMAIL');
      } else {
        println('ERROR: Server error. ', { color: dfstyles.colors.dfred });
        newline();
        // println('Press ENTER to return to homepage.', { color: dfstyles.colors.subtext });
        setStep('TERMINATED');
      }
    });
  }

  async function terminate() {
    println('Press any key to return to homepage.', { color: dfstyles.colors.subtext });
    // setStep('')
    prompt(() => {
      clear();
      push('/');
    });
  }

  async function requestPlayerEmail() {
    if (!ethConnection.account) {
      println('No account selected', { color: dfstyles.colors.dfred });
      newline();
      setStep('ACCOUNT_SELECTION');

      return;
    }

    println('Enter your email address. ', { color: dfstyles.colors.text });
    println("We'll use this email address to notify you if you win a prize.");

    prompt(async (email) => {
      //   const response = await submitPlayerEmail(await ethConnection?.signMessageObject({ email }));
      const response = EmailResponse.Success;

      if (response === EmailResponse.Success) {
        println('Email successfully recorded.');
        setStep('FETCHING_ETH_DATA');
      } else if (response === EmailResponse.Invalid) {
        println('Email invalid. Please try again.', { color: dfstyles.colors.dfred });
        newline();
        setStep('ASKING_PLAYER_EMAIL');
      } else {
        println('Error recording email.', { color: dfstyles.colors.dfred });
        setStep('FETCHING_ETH_DATA');
      }
    });
  }

  async function loadGameData() {
    let newGameManager: GameManager;

    try {
      newGameManager = await GameManager.create({
        connection: ethConnection,
        terminal,
        contractAddress,
      });
    } catch (e) {
      console.error(e);

      setStep('ERROR');

      print('Network under heavy load. Please refresh the page, and check ', {
        color: dfstyles.colors.dfred,
      });

      printComponent(
        Link,
        { to: 'https://blockscout.com/poa/xdai/', color: dfstyles.colors.dfred },
        'https://blockscout.com/poa/xdai/'
      );

      newline();

      return;
    }

    setGameManager(newGameManager);

    window.df = newGameManager;

    const newGameUIManager = await GameUIManager.create(newGameManager, terminal);

    window.ui = newGameUIManager;

    newline();
    println('Connected to Dark Forest Contract');
    gameUIManagerRef.current = newGameUIManager;

    if (!newGameManager.hasJoinedGame()) {
      setStep(TerminalPromptStep.NO_HOME_PLANET);
    } else {
      const browserHasData = !!newGameManager.getHomeCoords();
      if (!browserHasData) {
        println('ERROR: Home coords not found on this browser.', TerminalTextStyle.Red);
        setStep(TerminalPromptStep.ASK_ADD_ACCOUNT);
        return;
      }
      println('Validated Local Data...');
      setStep(TerminalPromptStep.ALL_CHECKS_PASS);
    }
  }
</script>

<Terminal />
