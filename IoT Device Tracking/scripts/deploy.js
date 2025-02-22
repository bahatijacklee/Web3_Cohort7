const { ethers } = require("hardhat");
require("dotenv").config();

async function deployContract(name, factory, ...args) {
  console.log(`\nDeploying ${name}...`);
  
  // Get current gas price and add 20% for faster confirmation
  const gasPrice = (await ethers.provider.getGasPrice()).mul(120).div(100);
  
  const contract = await factory.deploy(...args, {
    gasPrice: gasPrice
  });
  await contract.deployed();
  console.log(`${name} deployed to:`, contract.address);
  return contract;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  try {
    // Deploy one at a time with balance checks
    const AccessManager = await ethers.getContractFactory("AccessManager");
    const accessManager = await deployContract("AccessManager", AccessManager);
    
    // Check balance before next deployment
    const balance1 = await deployer.getBalance();
    console.log("Remaining balance:", ethers.utils.formatEther(balance1), "ETH");
    
    const DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
    const deviceRegistry = await deployContract("DeviceRegistry", DeviceRegistry, accessManager.address);
    
    // Check balance again
    const balance2 = await deployer.getBalance();
    console.log("Remaining balance:", ethers.utils.formatEther(balance2), "ETH");

    // Continue with other deployments only if we have enough balance
    if (balance2.lt(ethers.utils.parseEther("0.1"))) {
      console.log("Warning: Low balance, please add more funds before continuing");
      process.exit(1);
    }

    // Deploy IoTDataLedger with both addresses
    console.log("\nDeploying IoTDataLedger...");
    const IoTDataLedger = await ethers.getContractFactory("IoTDataLedger");
    const iotDataLedger = await IoTDataLedger.deploy(
        accessManager.address,
        deviceRegistry.address
    );
    await iotDataLedger.deployed();
    console.log("IoTDataLedger deployed to:", iotDataLedger.address);

    // Deploy TokenRewards with AccessManager and IoTDataLedger
    console.log("\nDeploying TokenRewards...");
    const TokenRewards = await ethers.getContractFactory("TokenRewards");
    const tokenRewards = await TokenRewards.deploy(
        accessManager.address,
        iotDataLedger.address
    );
    await tokenRewards.deployed();
    console.log("TokenRewards deployed to:", tokenRewards.address);

    // Deploy OracleIntegration with updated parameters
    console.log("\nDeploying OracleIntegration...");
    const OracleIntegration = await ethers.getContractFactory("OracleIntegration");
    
    // Convert job ID to bytes32 using a different method
    const jobId = ethers.utils.hexZeroPad(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(process.env.CHAINLINK_JOB_ID)),
      32
    );

    const oracleIntegration = await OracleIntegration.deploy(
        accessManager.address,
        process.env.CHAINLINK_TOKEN,
        process.env.CHAINLINK_ORACLE,
        jobId,
        process.env.CHAINLINK_FEE,
        iotDataLedger.address,
        tokenRewards.address
    );
    await oracleIntegration.deployed();
    console.log("OracleIntegration deployed to:", oracleIntegration.address);

    // Set up roles through AccessManager
    console.log("\nSetting up roles and permissions...");
    
    // Grant roles using the modified grantRole function
    await accessManager.grantRole(await accessManager.DEVICE_MANAGER_ROLE(), deployer.address);
    console.log("Granted DEVICE_MANAGER_ROLE to deployer");
    
    await accessManager.grantRole(await accessManager.DATA_MANAGER_ROLE(), oracleIntegration.address);
    console.log("Granted DATA_MANAGER_ROLE to OracleIntegration");
    
    await accessManager.grantRole(await accessManager.ORACLE_ROLE(), oracleIntegration.address);
    console.log("Granted ORACLE_ROLE to OracleIntegration");

    // Wait for block confirmations
    console.log("\nWaiting for block confirmations...");
    await deviceRegistry.deployTransaction.wait(5);
    await iotDataLedger.deployTransaction.wait(5);
    await tokenRewards.deployTransaction.wait(5);
    await oracleIntegration.deployTransaction.wait(5);

    // Verify contracts on Etherscan
    console.log("\nVerifying contracts on Etherscan...");
    await hre.run("verify:verify", {
      address: accessManager.address,
      constructorArguments: [],
    });

    await hre.run("verify:verify", {
      address: deviceRegistry.address,
      constructorArguments: [accessManager.address],
    });

    await hre.run("verify:verify", {
      address: iotDataLedger.address,
      constructorArguments: [accessManager.address, deviceRegistry.address],
    });

    await hre.run("verify:verify", {
      address: tokenRewards.address,
      constructorArguments: [accessManager.address, iotDataLedger.address],
    });

    await hre.run("verify:verify", {
      address: oracleIntegration.address,
      constructorArguments: [
        accessManager.address,
        process.env.CHAINLINK_TOKEN,
        process.env.CHAINLINK_ORACLE,
        jobId,
        process.env.CHAINLINK_FEE,
        iotDataLedger.address,
        tokenRewards.address,
      ],
    });

    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      accessManager: accessManager.address,
      deviceRegistry: deviceRegistry.address,
      iotDataLedger: iotDataLedger.address,
      tokenRewards: tokenRewards.address,
      oracleIntegration: oracleIntegration.address,
      timestamp: new Date().toISOString(),
    };

    const fs = require("fs");
    fs.writeFileSync(
      "deployment-info.json",
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to deployment-info.json");

  } catch (error) {
    console.error("\nError during deployment:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });