# Dark Forest Smart Contracts

## Development Guide

### Folder setup

All of our smartcontract related code are located in the `/eth` directory.

- `/eth/contracts` contains the smartcontract code written in solidity
- `/eth/test` contains the test for the smartcontract written in Javascript

### Installing Core Dependencies

- Node (v16.x)
- Npm (v8+)

#### Installing The Correct Node Version Using NVM

Dark Forest is built and tested using Node.js v14/v16 and might not run properly on other Node.js versions. We recommend using NVM to switch between multiple Node.js version on your machine.

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
nvm install
```

After the installation is finished, you can run `node --version` to verify that you are running v14 or v16

#### Installing Dependencies

After you have Node & Npm installed, run `npm ci` to install dev dependencies:

### Run Locally

To run the tests run `npm test`

To deploy contracts locally, you'll need to run 2 commands:

1. Start a node by running `npm run hardhat:node`
2. Then (in another terminal) deploy contracts by running `npm run hardhat:dev deploy -- --whitelist false`

You can import the private key of one of the accounts `hardhat node` created and funded, which are printed when you started the node such as:

```
Account #2: 0x3097403b64fe672467345bf159f4c9c5464bd89e (100 ETH)
Private Key: 0x67195c963ff445314e667112ab22f4a7404bad7f9746564eb409b9bb8c6aed32
```

## subgraph

Assuming you already have your contracts deployed be it on a local node or on a mainnet, you'll have the `abi/DarkForest.json` file, the `CONTRACT_ADDRESS` address, and the block the diamond contract was initialized at (so you dont waste time syncing from the genesis block) inside the `@dfdao/contracts` packag. In development, the start block will be set at 0.

## TheGraph hosted solution

For TheGraph hosted service, you need to create an account on thegraph.com, and create a subgraph using the web interface and note the namespace yourloginname/graphname. Find the access token for this graph (it should be on the top row of the interface), and run

`graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>`

in your terminal.

Then put the contract addresses into the templates and codgen thegraph files
`npm run subgraph:template:prod`

Finally ask them to start the indexing
`npm run subgraph:deploy:prod -- yourloginname/graphname`

## local development

To run a local copy of thegraph make sure docker is installed and then run `npm start -- --subgraph df` OR if you already have your contracts deployed and running run `npm run subgraph:deploy:dev` and find your local hosted explorer at `http://localhost:8000/subgraphs/name/df`
