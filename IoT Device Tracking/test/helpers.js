const { ethers } = require("hardhat");

async function deployContracts() {
  const [owner, deviceManager, user, oracle] = await ethers.getSigners();

  // Deploy DeviceRegistry
  const DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
  const deviceRegistry = await DeviceRegistry.deploy();
  await deviceRegistry.deployed();

  // Deploy IoTDataLedger
  const IoTDataLedger = await ethers.getContractFactory("IoTDataLedger");
  const iotDataLedger = await IoTDataLedger.deploy(deviceRegistry.address);
  await iotDataLedger.deployed();

  // Deploy TokenRewards
  const TokenRewards = await ethers.getContractFactory("TokenRewards");
  const tokenRewards = await TokenRewards.deploy(iotDataLedger.address);
  await tokenRewards.deployed();

  // Deploy AccessManager
  const AccessManager = await ethers.getContractFactory("AccessManager");
  const accessManager = await AccessManager.deploy();
  await accessManager.deployed();

  // Deploy OracleIntegration with mock values for testing
  const OracleIntegration = await ethers.getContractFactory("OracleIntegration");
  const mockLinkToken = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
  const oracleIntegration = await OracleIntegration.deploy(
    mockLinkToken,
    oracle.address,
    ethers.utils.formatBytes32String("TEST_JOB_ID"),
    ethers.utils.parseEther("0.1"),
    iotDataLedger.address,
    tokenRewards.address
  );
  await oracleIntegration.deployed();

  // Set up roles
  const DEVICE_MANAGER_ROLE = await deviceRegistry.DEVICE_MANAGER_ROLE();
  await deviceRegistry.grantRole(DEVICE_MANAGER_ROLE, deviceManager.address);

  const DATA_MANAGER_ROLE = await iotDataLedger.DATA_MANAGER_ROLE();
  await iotDataLedger.grantRole(DATA_MANAGER_ROLE, oracleIntegration.address);

  const ORACLE_ROLE = await tokenRewards.ORACLE_ROLE();
  await tokenRewards.grantRole(ORACLE_ROLE, oracleIntegration.address);

  return {
    deviceRegistry,
    iotDataLedger,
    tokenRewards,
    accessManager,
    oracleIntegration,
    owner,
    deviceManager,
    user,
    oracle
  };
}

module.exports = {
  deployContracts
}; 