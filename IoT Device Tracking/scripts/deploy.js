const { ethers } = require("hardhat");
require("dotenv").config();

async function deployContract(name, factory, ...args) {
  console.log(`\nDeploying ${name}...`);
  const gasPrice = (await ethers.provider.getGasPrice()).mul(120).div(100);
  const contract = await factory.deploy(...args, { gasPrice });
  await contract.deployed();
  console.log(`${name} deployed to:`, contract.address);
  return contract;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  try {
    const AccessManager = await ethers.getContractFactory("AccessManager");
    const accessManager = await deployContract("AccessManager", AccessManager);

    const balance1 = await deployer.getBalance();
    console.log("Remaining balance:", ethers.utils.formatEther(balance1), "ETH");

    const DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
    const deviceRegistry = await deployContract("DeviceRegistry", DeviceRegistry, accessManager.address);

    const balance2 = await deployer.getBalance();
    console.log("Remaining balance:", ethers.utils.formatEther(balance2), "ETH");

    if (balance2.lt(ethers.utils.parseEther("0.1"))) {
      console.log("Warning: Low balance, please add more funds before continuing");
      process.exit(1);
    }

    const IoTDataLedger = await ethers.getContractFactory("IoTDataLedger");
    const iotDataLedger = await deployContract("IoTDataLedger", IoTDataLedger, accessManager.address, deviceRegistry.address);

    const TokenRewards = await ethers.getContractFactory("TokenRewards");
    const tokenRewards = await deployContract("TokenRewards", TokenRewards, accessManager.address, iotDataLedger.address, ethers.constants.AddressZero); // Fixed constructor args

    const OracleIntegration = await ethers.getContractFactory("OracleIntegration");
    const jobId = ethers.utils.formatBytes32String(process.env.CHAINLINK_JOB_ID || "default-job-id"); // Simplified jobId
    const oracleIntegration = await deployContract(
      "OracleIntegration",
      OracleIntegration,
      accessManager.address,
      process.env.CHAINLINK_TOKEN,
      process.env.CHAINLINK_ORACLE,
      jobId,
      process.env.CHAINLINK_FEE || ethers.utils.parseEther("0.1"), // Default fee if missing
      iotDataLedger.address,
      tokenRewards.address
    );

    console.log("\nSetting up roles...");
    await accessManager.grantRole(await accessManager.DEVICE_MANAGER_ROLE(), deployer.address);
    console.log("Granted DEVICE_MANAGER_ROLE to deployer");
    await accessManager.grantRole(await accessManager.DATA_MANAGER_ROLE(), oracleIntegration.address);
    console.log("Granted DATA_MANAGER_ROLE to OracleIntegration");
    await accessManager.grantRole(await accessManager.ORACLE_ROLE(), oracleIntegration.address);
    console.log("Granted ORACLE_ROLE to OracleIntegration");

    console.log("\nWaiting for confirmations...");
    await Promise.all([
      accessManager.deployTransaction.wait(5),
      deviceRegistry.deployTransaction.wait(5),
      iotDataLedger.deployTransaction.wait(5),
      tokenRewards.deployTransaction.wait(5),
      oracleIntegration.deployTransaction.wait(5),
    ]);

    console.log("\nVerifying contracts on Etherscan...");
    await hre.run("verify:verify", { address: accessManager.address, constructorArguments: [] });
    await hre.run("verify:verify", { address: deviceRegistry.address, constructorArguments: [accessManager.address] });
    await hre.run("verify:verify", { address: iotDataLedger.address, constructorArguments: [accessManager.address, deviceRegistry.address] });
    await hre.run("verify:verify", { address: tokenRewards.address, constructorArguments: [accessManager.address, iotDataLedger.address, ethers.constants.AddressZero] });
    await hre.run("verify:verify", {
      address: oracleIntegration.address,
      constructorArguments: [
        accessManager.address,
        process.env.CHAINLINK_TOKEN,
        process.env.CHAINLINK_ORACLE,
        jobId,
        process.env.CHAINLINK_FEE || ethers.utils.parseEther("0.1"),
        iotDataLedger.address,
        tokenRewards.address,
      ],
    });

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
    fs.writeFileSync("deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
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