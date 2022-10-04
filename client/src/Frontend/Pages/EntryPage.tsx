import { CONTRACT_ADDRESS } from '@dfdao/contracts';
import { EthConnection, ThrottledConcurrentQueue, weiToEth } from '@dfdao/network';
import { address } from '@dfdao/serde';
import { EthAddress } from '@dfdao/types';
import { utils, Wallet } from 'ethers';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch, useHistory } from 'react-router-dom';
import {
  Account,
  addAccount,
  getAccounts,
  getActive,
  logOut,
} from '../../Backend/Network/AccountManager';
import { getEthConnection } from '../../Backend/Network/Blockchain';
import { getAllTwitters } from '../../Backend/Network/UtilityServerAPI';
import { AddressTwitterMap } from '../../_types/darkforest/api/UtilityServerAPITypes';
import { InitRenderState, TerminalWrapper, Wrapper } from '../Components/GameLandingPageComponents';
import { MythicLabelText } from '../Components/Labels/MythicLabel';
import { TextPreview } from '../Components/TextPreview';
import { EthConnectionProvider, TwitterProvider } from '../Utils/AppHooks';
import { Incompatibility, unsupportedFeatures } from '../Utils/BrowserChecks';
import { TerminalTextStyle } from '../Utils/TerminalTypes';
import { Terminal, TerminalHandle } from '../Views/Terminal';
import { CreateLobby } from './CreateLobby';
import { GameLandingPage } from './GameLandingPage';
import LoadingPage from './LoadingPage';
import { NotFoundPage } from './NotFoundPage';

const defaultAddress = address(CONTRACT_ADDRESS);
class EntryPageTerminal {
  private ethConnection: EthConnection;
  private terminal: TerminalHandle;
  private accountSet: (account: Account, tutorial: boolean) => void;
  private balancesEth: number[];

  public constructor(
    ethConnection: EthConnection,
    terminal: TerminalHandle,
    accountSet: (account: Account, tutorial: boolean) => void
  ) {
    this.ethConnection = ethConnection;
    this.terminal = terminal;
    this.accountSet = accountSet;
  }

  private async loadBalances(addresses: EthAddress[]) {
    const queue = new ThrottledConcurrentQueue({
      invocationIntervalMs: 1000,
      maxInvocationsPerIntervalMs: 25,
    });

    const balances = await Promise.all(
      addresses.map((address) => queue.add(() => this.ethConnection.loadBalance(address)))
    );

    this.balancesEth = balances.map(weiToEth);
  }

  public async checkCompatibility() {
    this.terminal?.printElement(<MythicLabelText text='Welcome to Dark Forest Arena' />);
    this.terminal?.newline();
    this.terminal?.newline();

    const issues = await unsupportedFeatures();

    if (issues.includes(Incompatibility.MobileOrTablet)) {
      this.terminal.println(
        'ERROR: Mobile or tablet device detected. Please use desktop.',
        TerminalTextStyle.Red
      );
    }

    if (issues.includes(Incompatibility.NoIDB)) {
      this.terminal.println(
        'ERROR: IndexedDB not found. Try using a different browser.',
        TerminalTextStyle.Red
      );
    }

    if (issues.includes(Incompatibility.UnsupportedBrowser)) {
      this.terminal.println(
        'ERROR: Browser unsupported. Try Brave, Firefox, or Chrome.',
        TerminalTextStyle.Red
      );
    }

    if (issues.length > 0) {
      this.terminal.print(`${issues.length.toString()} errors found. `, TerminalTextStyle.Red);
      this.terminal.println('Please resolve them and refresh the page.');
      return;
    } else {
      this.terminal?.println(`Login or create an account.`);
      this.terminal?.println(`To choose an option, type its symbol and press ENTER.`);
      await this.chooseAccount();
    }
  }
  public async chooseAccount() {
    const accounts = getAccounts();

    this.terminal?.newline();
    this.terminal?.println(`Found ${accounts.length} accounts on this device. `);
    this.terminal?.newline();

    try {
      await this.loadBalances(accounts.map((a) => a.address));
    } catch (e) {
      console.log(e);
      this.terminal?.println(
        `Error loading balances. Reload the page to try again.`,
        TerminalTextStyle.Red
      );
      return;
    }

    accounts.forEach((account, i) => {
      this.terminal?.print(`(${i + 1}): `, TerminalTextStyle.Sub);
      this.terminal?.print(`${account.address} `);
      this.terminal?.println(
        this.balancesEth[i].toFixed(2) + ' xDAI',
        this.balancesEth[i] < 0.01 ? TerminalTextStyle.Red : TerminalTextStyle.Green
      );
    });

    this.terminal?.print('(n) ', TerminalTextStyle.Sub);
    this.terminal?.println(`Create new account.`);
    this.terminal?.print('(i) ', TerminalTextStyle.Sub);
    this.terminal?.println(`Import account using private key.`);
    this.terminal?.println(``);
    this.terminal?.println(`Select an option:`, TerminalTextStyle.Text);

    const userInput = await this.terminal?.getInput();

    if (+userInput && +userInput <= accounts.length && +userInput > 0) {
      const selectedAccount = accounts[+userInput - 1];
      this.drip(selectedAccount, false);
    } else if (userInput === 'n') {
      this.generateAccount();
    } else if (userInput === 'i') {
      this.importAccount();
    } else {
      this.terminal?.println('Unrecognized input. Please try again.', TerminalTextStyle.Red);
      this.terminal?.println('');
      await this.chooseAccount();
    }
  }

  private async generateAccount() {
    const newWallet = Wallet.createRandom();
    const account: Account = {
      privateKey: newWallet.privateKey,
      address: address(newWallet.address),
    };

    try {
      this.terminal.println(``);
      this.terminal.print(`Creating new account with address `);
      this.terminal.printElement(<TextPreview text={account.address} unFocusedWidth={'100px'} />);
      this.terminal.println(``);
      this.terminal.println('');
      this.terminal.print('Note: This account is a ', TerminalTextStyle.Sub);
      this.terminal.println('burner wallet.', TerminalTextStyle.Red);
      this.terminal.println('It should never store substantial funds!', TerminalTextStyle.Sub);
      this.terminal.newline();
      this.drip(account);
    } catch (e) {
      console.log(e);
      this.terminal.println('An unknown error occurred. please try again.', TerminalTextStyle.Red);
    }
  }

  private async importAccount() {
    this.terminal.println(
      'Enter the 0x-prefixed private key of the account you wish to import.',
      TerminalTextStyle.Text
    );
    this.terminal.newline();
    this.terminal.print('Note: This account is a ', TerminalTextStyle.Sub);
    this.terminal.println('burner wallet.', TerminalTextStyle.Red);
    this.terminal.println('It should never store substantial funds!', TerminalTextStyle.Sub);

    this.terminal.newline();
    this.terminal.println('(x) to cancel', TerminalTextStyle.Text);
    this.terminal.newline();
    const newSKey = await this.terminal.getInput();
    if (newSKey === 'x') {
      this.terminal.newline();
      this.terminal.println('Cancelled import.', TerminalTextStyle.Text);
      await this.chooseAccount();
      return;
    }
    try {
      const newAddr = address(utils.computeAddress(newSKey));

      this.terminal.println(`Successfully created account with address ${newAddr.toString()}`);
      this.terminal.newline();

      this.drip({ address: newAddr, privateKey: newSKey });
    } catch (e) {
      this.terminal.println('An unknown error occurred. please try again.', TerminalTextStyle.Red);
      this.terminal.println('');
      this.importAccount();
    }
  }

  private async setAccount(account: Account, tutorial: boolean) {
    try {
      await this.ethConnection.setAccount(account.privateKey);
      this.accountSet(account, tutorial);
    } catch (e) {
      console.log(e);
      await new Promise((r) => setTimeout(r, 1500));
      await this.chooseAccount();
    }
  }

  private async playTutorial(account: Account) {
    try {
      if (!getAccounts().find((acc) => acc.address == account.address))
        addAccount(account.privateKey);

      this.terminal.println('This is a new account. Would you like to play the tutorial?');
      this.terminal?.print('(y) ', TerminalTextStyle.Sub);
      this.terminal?.println(`Yes. Take me to the tutorial.`);
      this.terminal?.print('(n) ', TerminalTextStyle.Sub);
      this.terminal?.println(`No. Take me to the game.`);
      const userInput = await this.terminal?.getInput();
      if (userInput === 'y') {
        this.setAccount(account, true);
      } else if (userInput === 'n') {
        this.setAccount(account, false);
      } else {
        this.terminal?.println('Unrecognized input. Please try again.', TerminalTextStyle.Red);
        this.terminal?.println('');
        await this.playTutorial(account);
      }
    } catch (e) {}
  }

  private async drip(account: Account, tutorialStep: boolean = true) {
    try {
      const currBalance = weiToEth(await this.ethConnection.loadBalance(account.address));
      if (currBalance < 0.005) {
        this.terminal.println(`Loading...`);
        // await sendDrip(this.ethConnection, account.address);
        const newBalance = weiToEth(await this.ethConnection.loadBalance(account.address));
        if (newBalance - currBalance > 0) {
          this.terminal.println(`complete`, TerminalTextStyle.Green);
        } else {
          throw new Error('drip failed.');
        }
      }
      if (tutorialStep) await this.playTutorial(account);
      else await this.setAccount(account, false);
    } catch (e) {
      console.log(e);
      this.terminal?.println('Registation failed. Try again with an account that has XDAI tokens.');
      await new Promise((r) => setTimeout(r, 2000));
      this.terminal?.newline();

      await this.chooseAccount();
    }
  }
}

type LoadingStatus = 'loading' | 'creating' | 'complete';
export function EntryPage() {
  const terminal = useRef<TerminalHandle>();
  const history = useHistory();
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('loading');
  const [controller, setController] = useState<EntryPageTerminal | undefined>();

  const [twitters, setTwitters] = useState<AddressTwitterMap>({});
  const twitterContext = { twitters, setTwitters };

  const [connection, setConnection] = useState<EthConnection | undefined>();
  /* get all twitters on page load */

  useEffect(() => {
    getAllTwitters().then((t) => setTwitters(t));
  }, []);

  /* set connection on page load */
  useEffect(() => {
    async function getConnection() {
      try {
        const connection = await getEthConnection();
        setConnection(connection);
        setLoadingStatus('creating');
      } catch (e) {
        alert('error connecting to blockchain');
        console.log(e);
      }
    }
    getConnection();
  }, []);

  /* once connection is set, get active player from local storage and set account */
  useEffect(() => {
    async function setPlayer(ethConnection: EthConnection) {
      const active = getActive();
      try {
        if (!!active) {
          // await sendDrip(ethConnection, active.address);
          await ethConnection.setAccount(active.privateKey);
          setLoadingStatus('complete');
        } else {
          setLoadingStatus('creating');
        }
      } catch (e) {
        // alert('Unable to connect to active account. Please login into another.');
        console.error('Unable to connect to active account. Please login into another.');
        logOut();
      }
    }
    if (connection) {
      setPlayer(connection);
    }
  }, [connection]);

  const controllerHandler = useCallback(
    (terminalRef) => {
      if (!controller && connection) {
        const newController = new EntryPageTerminal(
          connection,
          terminalRef,
          async (account: Account, tutorial: boolean) => {
            await connection.setAccount(account.privateKey);

            setLoadingStatus('complete');
          }
        );
        newController.checkCompatibility();
      }
    },
    [connection, controller]
  );

  if (!connection || !twitters || loadingStatus == 'loading') {
    return <LoadingPage />;
  } else if (loadingStatus == 'creating') {
    return (
      <Wrapper initRender={InitRenderState.NONE} terminalEnabled={false}>
        <TerminalWrapper initRender={InitRenderState.NONE} terminalEnabled={false}>
          <Terminal ref={controllerHandler} promptCharacter={'$'} />
        </TerminalWrapper>

        {/* this div is here so the styling matches gamelandingpage styling*/}
        <div></div>
      </Wrapper>
    );
  } else
    return (
      <EthConnectionProvider value={connection}>
        <TwitterProvider value={twitterContext}>
          <Router>
            <Switch>
              <Redirect path='/play' to={`/play/${defaultAddress}`} push={true} exact={true} />
              <Route path='/play/:contract' component={GameLandingPage} />
              <Redirect path='/arena' to={`/arena/${defaultAddress}`} push={true} exact={true} />
              <Route path='/arena/:contract' component={CreateLobby} />
              <Route path='*' component={NotFoundPage} />
            </Switch>
          </Router>
        </TwitterProvider>
      </EthConnectionProvider>
    );
}
