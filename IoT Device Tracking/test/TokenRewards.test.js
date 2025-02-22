const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts } = require("./helpers");

describe("TokenRewards", function () {
  let deviceRegistry;
  let iotDataLedger;
  let tokenRewards;
  let oracleIntegration;
  let owner;
  let deviceManager;
  let user;
  let oracle;
  let deviceHash;

  beforeEach(async function () {
    const contracts = await deployContracts();
    deviceRegistry = contracts.deviceRegistry;
    iotDataLedger = contracts.iotDataLedger;
    tokenRewards = contracts.tokenRewards;
    oracleIntegration = contracts.oracleIntegration;
    owner = contracts.owner;
    deviceManager = contracts.deviceManager;
    user = contracts.user;
    oracle = contracts.oracle;

    // Register a test device
    deviceHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("testDevice"));
    await deviceRegistry.connect(user).registerDevice(
      deviceHash,
      "temperature_sensor",
      "TestMfg",
      "Test-01",
      "Building A",
      "0x"
    );

    // Record and validate some data
    const dataType = ethers.utils.formatBytes32String("TEMPERATURE");
    const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("25.5C"));

    await iotDataLedger.connect(user).recordData(
      deviceHash,
      dataType,
      dataHash
    );

    const timestamp = (await ethers.provider.getBlock('latest')).timestamp;
    await iotDataLedger.connect(deviceManager).validateData(
      deviceHash,
      timestamp
    );
  });

  describe("Reward Claims", function () {
    it("Should allow users to claim rewards for validated data", async function () {
      const initialBalance = await tokenRewards.balanceOf(user.address);
      await tokenRewards.connect(user).claimRewards(deviceHash);
      const finalBalance = await tokenRewards.balanceOf(user.address);
      
      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseUnits("1", 6)); // 1 token
    });

    it("Should not allow double claiming", async function () {
      await tokenRewards.connect(user).claimRewards(deviceHash);
      
      await expect(
        tokenRewards.connect(user).claimRewards(deviceHash)
      ).to.be.revertedWith("No rewards available");
    });
  });

  describe("Reward Slashing", function () {
    it("Should slash rewards for invalid data", async function () {
      // First claim some rewards
      await tokenRewards.connect(user).claimRewards(deviceHash);
      const initialBalance = await tokenRewards.balanceOf(user.address);

      // Slash rewards through oracle
      await tokenRewards.connect(oracle).slashRewards(deviceHash, user.address);
      const finalBalance = await tokenRewards.balanceOf(user.address);

      // Should slash 10% by default
      expect(initialBalance.sub(finalBalance)).to.equal(
        initialBalance.mul(10).div(100)
      );
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update reward rate", async function () {
      const newRate = ethers.utils.parseUnits("2", 6); // 2 tokens
      await tokenRewards.connect(owner).setRewardRate(newRate);
      
      // Record and validate new data
      const dataType = ethers.utils.formatBytes32String("TEMPERATURE");
      const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("26.5C"));
      
      await iotDataLedger.connect(user).recordData(deviceHash, dataType, dataHash);
      const timestamp = (await ethers.provider.getBlock('latest')).timestamp;
      await iotDataLedger.connect(deviceManager).validateData(deviceHash, timestamp);

      // Claim rewards with new rate
      const initialBalance = await tokenRewards.balanceOf(user.address);
      await tokenRewards.connect(user).claimRewards(deviceHash);
      const finalBalance = await tokenRewards.balanceOf(user.address);

      expect(finalBalance.sub(initialBalance)).to.equal(newRate);
    });
  });
}); 