A guide on how to integrate your smart contracts with your frontend and deploy them on the Sepolia testnet.

---

## **Step 1: Set Up Your Hardhat Project**

1. **Create a New Project Folder**  
   Open your terminal and create a new directory, then initialize npm:
   ```bash
   mkdir iot-blockchain-platform
   cd iot-blockchain-platform
   npm init -y
   ```

2. **Install Hardhat and Plugins**  
   Install Hardhat along with useful plugins:
   ```bash
   npm install --save-dev hardhat @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan ethers
   ```

3. **Initialize Hardhat**  
   Run:
   ```bash
   npx hardhat
   ```
   - Choose “Create a basic sample project” (JavaScript project).
   - Accept installation of dependencies when prompted.

4. **Project Folder Structure**  
   Your directory should look like:
   ```
   iot-blockchain-platform/
   ├── contracts/
   │   ├── DeviceRegistry.sol
   │   ├── IoTDataLedger.sol
   │   ├── OracleIntegration.sol
   │   └── TokenRewards.sol
   ├── scripts/
   │   └── deploy.js
   ├── test/
   │   └── sample-test.js
   ├── hardhat.config.js
   ├── package.json
   └── .env
   ```

---

## **Step 2: Configure Hardhat for Sepolia and Etherscan**

1. **Create a `.env` File**  
   In your project root, add a file named `.env` and include:
   ```plaintext
   ALCHEMY_SEPOLIA_URL=https://eth-sepolia.alchemyapi.io/v2/YOUR_ALCHEMY_API_KEY
   SEPOLIA_PRIVATE_KEY=your_private_key_without_0x
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```
   Replace the placeholders with your actual keys.

2. **Edit `hardhat.config.js`**  
   Update your configuration to include the Sepolia network and Etherscan plugin:
   ```js
   require("@nomiclabs/hardhat-ethers");
   require("@nomiclabs/hardhat-etherscan");
   require("dotenv").config();

   module.exports = {
     solidity: "0.8.19",
     networks: {
       sepolia: {
         url: process.env.ALCHEMY_SEPOLIA_URL,
         accounts: [process.env.SEPOLIA_PRIVATE_KEY],
       },
     },
     etherscan: {
       apiKey: process.env.ETHERSCAN_API_KEY,
     },
   };
   ```

---

## **Step 3: Write Deployment Scripts**

1. **Create a Deployment Script (`scripts/deploy.js`)**  
   This script will deploy your contracts in sequence. For example:
   ```js
   async function main() {
     const [deployer] = await ethers.getSigners();
     console.log("Deploying contracts with:", deployer.address);

     // Deploy DeviceRegistry
     const DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
     const deviceRegistry = await DeviceRegistry.deploy();
     await deviceRegistry.deployed();
     console.log("DeviceRegistry deployed to:", deviceRegistry.address);

     // Deploy IoTDataLedger
     const IoTDataLedger = await ethers.getContractFactory("IoTDataLedger");
     const dataLedger = await IoTDataLedger.deploy();
     await dataLedger.deployed();
     console.log("IoTDataLedger deployed to:", dataLedger.address);

     // Deploy TokenRewards (pass the dataLedger address)
     const TokenRewards = await ethers.getContractFactory("TokenRewards");
     const tokenRewards = await TokenRewards.deploy(dataLedger.address);
     await tokenRewards.deployed();
     console.log("TokenRewards deployed to:", tokenRewards.address);

     // Deploy OracleIntegration (pass required addresses & config)
     const OracleIntegration = await ethers.getContractFactory("OracleIntegration");
     // Replace these placeholders with your actual Chainlink config values
     const linkTokenAddress = "0x..."; // Sepolia LINK token address
     const oracleAddress = "0x...";    // Your Chainlink oracle address
     const jobId = "0x...";            // Your jobId (bytes32)
     const fee = ethers.utils.parseEther("0.1"); // Example fee
     const oracleIntegration = await OracleIntegration.deploy(
       linkTokenAddress,
       oracleAddress,
       jobId,
       fee,
       dataLedger.address,
       tokenRewards.address
     );
     await oracleIntegration.deployed();
     console.log("OracleIntegration deployed to:", oracleIntegration.address);
   }

   main()
     .then(() => process.exit(0))
     .catch((error) => {
       console.error(error);
       process.exit(1);
     });
   ```

2. **Verify Deployment**  
   Run the deployment script on Sepolia:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

---

## **Step 4: Contract Verification on Etherscan**

1. **After Deployment, Verify Contracts**  
   Use the Hardhat Etherscan plugin:
   ```bash
   npx hardhat verify --network sepolia <contract_address> "ConstructorArg1" "ConstructorArg2" ...
   ```
   For example:
   ```bash
   npx hardhat verify --network sepolia <TokenRewards_address> <dataLedger_address>
   ```
   You can automate this in your deployment script if desired.

---

## **Step 5: Testing with Hardhat**

1. **Write Unit Tests**  
   Create tests in the `test/` folder using Mocha/Chai. For example, in `test/sample-test.js`:
   ```js
   const { expect } = require("chai");

   describe("TokenRewards", function () {
     it("Should allow users to claim rewards", async function () {
       // Deploy contracts, simulate valid data, then test claimRewards()
       // This is a simplified example:
       const TokenRewards = await ethers.getContractFactory("TokenRewards");
       const tokenRewards = await TokenRewards.deploy("0xYourDataLedgerAddress");
       await tokenRewards.deployed();

       // Assume dataLedger.getValidationCount returns a known value
       // Call claimRewards() and check that balanceOf(user) increases accordingly
       // (You can use a mock for IIoTDataLedger to simulate the behavior)
       expect(await tokenRewards.balanceOf("0xSomeUser")).to.equal(0);
     });
   });
   ```
2. **Run Tests**  
   ```bash
   npx hardhat test
   ```

---

## **Step 6: Next.js Frontend Integration**

1. **Set Up a Next.js Project**  
   In your workspace, run:
   ```bash
   npx create-next-app@latest frontend
   cd frontend
   npm install ethers web3modal
   ```
2. **Create a Connection Component**  
   Create a component (e.g., `components/WalletConnect.js`) to connect to MetaMask:
   ```jsx
   // components/WalletConnect.js
   import React, { useState, useEffect } from "react";
   import { ethers } from "ethers";
   import Web3Modal from "web3modal";

   const WalletConnect = () => {
     const [provider, setProvider] = useState(null);
     const [account, setAccount] = useState(null);

     useEffect(() => {
       if (provider) {
         provider.listAccounts().then((accounts) => {
           if (accounts.length) setAccount(accounts[0]);
         });
       }
     }, [provider]);

     const connectWallet = async () => {
       try {
         const web3Modal = new Web3Modal();
         const connection = await web3Modal.connect();
         const newProvider = new ethers.providers.Web3Provider(connection);
         setProvider(newProvider);
         const accounts = await newProvider.listAccounts();
         setAccount(accounts[0]);
       } catch (err) {
         console.error("Wallet connection failed:", err);
       }
     };

     return (
       <div>
         {account ? (
           <p>Connected: {account}</p>
         ) : (
           <button onClick={connectWallet}>Connect Wallet</button>
         )}
       </div>
     );
   };

   export default WalletConnect;
   ```
3. **Interacting with Smart Contracts**  
   Create a utility file (e.g., `utils/contract.js`) to initialize contract instances:
   ```js
   // utils/contract.js
   import { ethers } from "ethers";

   const deviceRegistryAddress = "0x..."; // Replace with deployed address
   const tokenRewardsAddress = "0x...";   // Replace with deployed address

   // Import ABI JSON files (ensure they are compiled and available)
   import DeviceRegistryABI from "../artifacts/contracts/DeviceRegistry.sol/DeviceRegistry.json";
   import TokenRewardsABI from "../artifacts/contracts/TokenRewards.sol/TokenRewards.json";

   export function getDeviceRegistryContract(provider) {
     return new ethers.Contract(deviceRegistryAddress, DeviceRegistryABI.abi, provider);
   }

   export function getTokenRewardsContract(provider) {
     return new ethers.Contract(tokenRewardsAddress, TokenRewardsABI.abi, provider);
   }
   ```
4. **Build a UI Page**  
   Create a page (e.g., `pages/index.js`) that uses your components:
   ```jsx
   // pages/index.js
   import React, { useState, useEffect } from "react";
   import WalletConnect from "../components/WalletConnect";
   import { getTokenRewardsContract } from "../utils/contract";
   import { ethers } from "ethers";

   const Home = () => {
     const [pendingRewards, setPendingRewards] = useState(0);
     const [provider, setProvider] = useState(null);
     const [account, setAccount] = useState(null);

     useEffect(() => {
       async function init() {
         if (window.ethereum) {
           const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
           setProvider(web3Provider);
           const accounts = await web3Provider.listAccounts();
           if (accounts.length) setAccount(accounts[0]);
         }
       }
       init();
     }, []);

     const fetchRewards = async () => {
       if (provider && account) {
         const tokenRewards = getTokenRewardsContract(provider);
         // Replace with your deviceHash (example: ethers.utils.formatBytes32String("device1"))
         const deviceHash = ethers.utils.formatBytes32String("device1");
         const rewards = await tokenRewards.calculateRewards(deviceHash, account);
         setPendingRewards(ethers.utils.formatUnits(rewards, 6));
       }
     };

     const claimRewards = async () => {
       if (provider && account) {
         const signer = provider.getSigner();
         const tokenRewards = getTokenRewardsContract(signer);
         const deviceHash = ethers.utils.formatBytes32String("device1");
         const tx = await tokenRewards.claimRewards(deviceHash);
         await tx.wait();
         fetchRewards(); // Update pending rewards after claim
       }
     };

     return (
       <div>
         <h1>IoT Device Rewards Dashboard</h1>
         <WalletConnect />
         <button onClick={fetchRewards}>Fetch Pending Rewards</button>
         <p>Pending Rewards: {pendingRewards}</p>
         <button onClick={claimRewards}>Claim Rewards</button>
       </div>
     );
   };

   export default Home;
   ```

---

## **Step 7: Final Checks & Deployment**

1. **Local Testing**  
   - Run `npx hardhat test` to ensure your contracts behave as expected.
   - Use Hardhat’s local node (`npx hardhat node`) to simulate deployments and interactions.

2. **Deploy on Sepolia**  
   - Use your deployment script as described above.
   - Verify contracts on Etherscan using Hardhat’s verify plugin.

3. **Next.js Frontend Deployment**  
   - Deploy your Next.js app (e.g., using Vercel).
   - Ensure environment variables (e.g., RPC URL) are correctly configured.

4. **Monitoring & Debugging**  
   - Use OpenZeppelin Defender or Tenderly for monitoring.
   - Check logs on Etherscan for deployed contract events.

---

## **Summary**
1. **Set up Hardhat with Sepolia & Etherscan.**  
2. **Write deployment scripts and run tests.**  
3. **Build a Next.js frontend using Ethers.js for wallet connection and contract interaction.**  
4. **Deploy contracts on Sepolia and verify them.**  
5. **Deploy the Next.js app and connect to your deployed contracts.**


Below is a detailed explanation on how to handle ABIs, create mocks, and set up utility functions for integration:

---

## **1. ABIs (Application Binary Interfaces)**
- **What They Are:**  
  ABIs define how your smart contracts interact (i.e., what functions and events exist). They are automatically generated when you compile your contracts with Hardhat.

- **How to Use Them:**  
  - After compilation, check the `artifacts/contracts/` folder.  
  - For example, the `TokenRewards.json` file will contain the ABI, which you can import into your Next.js project to interact with the contract.
  
- **Example in Next.js:**  
  ```js
  // utils/contract.js
  import { ethers } from "ethers";
  import TokenRewardsABI from "../artifacts/contracts/TokenRewards.sol/TokenRewards.json";
  
  const tokenRewardsAddress = "0x..."; // Replace with deployed address
  
  export function getTokenRewardsContract(provider) {
    return new ethers.Contract(tokenRewardsAddress, TokenRewardsABI.abi, provider);
  }
  ```
  
---

## **2. Mocks for Testing**
- **Why Use Mocks:**  
  Mocks simulate external dependencies. For example, if your contracts depend on external data from an oracle or an external contract (like `IIoTDataLedger`), you can create a mock contract for testing purposes.
  
- **How to Create a Mock:**  
  Create a new contract in your `contracts/mocks/` folder (or similar) that implements the same interface as the dependency.

- **Example: Mock for IIoTDataLedger.sol**  
  ```solidity
  // contracts/mocks/MockIoTDataLedger.sol
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.19;
  
  import "../interfaces/IIoTDataLedger.sol";
  
  contract MockIoTDataLedger is IIoTDataLedger {
      uint256 private _validationCount;
  
      // You can set this value manually in tests
      function setValidationCount(uint256 count) external {
          _validationCount = count;
      }
  
      // Implement the interface function
      function getValidationCount(bytes32 deviceHash) external view override returns (uint256) {
          return _validationCount;
      }
  }
  ```
  
- **Using Mocks in Tests:**  
  In your Hardhat tests, deploy `MockIoTDataLedger` and pass its address to `TokenRewards` (or any other dependent contract). This way, you simulate different validation counts without interacting with live data.

---

## **3. Utils in Your Frontend**
- **Purpose of Utils:**  
  Utility functions help you create and manage contract instances, format data, and perform common conversions.
  
- **Setting Up a Utils Folder:**  
  In your Next.js project, create a folder called `utils/` and add helper functions.
  
- **Example Utility Functions:**  
  ```js
  // utils/contract.js
  import { ethers } from "ethers";
  import DeviceRegistryABI from "../artifacts/contracts/DeviceRegistry.sol/DeviceRegistry.json";
  import TokenRewardsABI from "../artifacts/contracts/TokenRewards.sol/TokenRewards.json";
  
  const deviceRegistryAddress = "0x..."; // Replace with your deployed address
  const tokenRewardsAddress = "0x...";   // Replace with your deployed address
  
  export function getDeviceRegistryContract(provider) {
    return new ethers.Contract(deviceRegistryAddress, DeviceRegistryABI.abi, provider);
  }
  
  export function getTokenRewardsContract(provider) {
    return new ethers.Contract(tokenRewardsAddress, TokenRewardsABI.abi, provider);
  }
  ```
  
- **Helper Functions for Data Conversion:**  
  You may need functions to format bytes32 values to strings, convert between units, or handle timestamps.
  ```js
  // utils/helpers.js
  import { ethers } from "ethers";
  
  export function bytes32ToString(bytes32) {
    return ethers.utils.parseBytes32String(bytes32);
  }
  
  export function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }
  ```

---

## **Summary**
- **ABIs**: Generated automatically by Hardhat; import them into your frontend to create contract instances.
- **Mocks**: Create mock contracts (e.g., `MockIoTDataLedger.sol`) to simulate external dependencies in tests.
- **Utils**: Build a set of utility functions (in a `utils` folder) for contract instantiation and common data transformations in your Next.js frontend.

