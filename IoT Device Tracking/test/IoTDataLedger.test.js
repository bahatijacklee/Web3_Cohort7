const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts } = require("./helpers");

describe("IoTDataLedger", function () {
  let deviceRegistry;
  let iotDataLedger;
  let owner;
  let deviceManager;
  let user;
  let deviceHash;

  beforeEach(async function () {
    const contracts = await deployContracts();
    deviceRegistry = contracts.deviceRegistry;
    iotDataLedger = contracts.iotDataLedger;
    owner = contracts.owner;
    deviceManager = contracts.deviceManager;
    user = contracts.user;

    // Register a test device
    deviceHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("testDevice"));
    await deviceRegistry.connect(user).registerDevice(
      deviceHash,
      "temperature_sensor",
      "TestMfg",
      "Test-01",
      "Building A",
      "0x" // Empty signature for test
    );
  });

  describe("Data Recording", function () {
    it("Should record data for registered device", async function () {
      const dataType = ethers.utils.formatBytes32String("TEMPERATURE");
      const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("25.5C"));

      await iotDataLedger.connect(user).recordData(
        deviceHash,
        dataType,
        dataHash
      );

      const records = await iotDataLedger.getRecords(deviceHash, 0, 1);
      expect(records.length).to.equal(1);
      expect(records[0].dataHash).to.equal(dataHash);
      expect(records[0].dataType).to.equal(dataType);
    });

    it("Should fail to record data for unregistered device", async function () {
      const fakeDeviceHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("fakeDevice"));
      const dataType = ethers.utils.formatBytes32String("TEMPERATURE");
      const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("25.5C"));

      await expect(
        iotDataLedger.connect(user).recordData(
          fakeDeviceHash,
          dataType,
          dataHash
        )
      ).to.be.revertedWithCustomError(iotDataLedger, "InvalidDevice");
    });

    it("Should batch record data for multiple devices", async function () {
      const deviceHash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("testDevice2"));
      
      // Register second device
      await deviceRegistry.connect(user).registerDevice(
        deviceHash2,
        "humidity_sensor",
        "TestMfg",
        "Test-02",
        "Building B",
        "0x"
      );

      const dataType1 = ethers.utils.formatBytes32String("TEMPERATURE");
      const dataType2 = ethers.utils.formatBytes32String("HUMIDITY");
      const dataHash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("25.5C"));
      const dataHash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("60%"));

      await iotDataLedger.connect(user).batchRecordData(
        [deviceHash, deviceHash2],
        [dataType1, dataType2],
        [dataHash1, dataHash2]
      );

      const records1 = await iotDataLedger.getRecords(deviceHash, 0, 1);
      const records2 = await iotDataLedger.getRecords(deviceHash2, 0, 1);

      expect(records1[0].dataHash).to.equal(dataHash1);
      expect(records2[0].dataHash).to.equal(dataHash2);
    });
  });

  describe("Data Validation", function () {
    it("Should validate recorded data", async function () {
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

      // Try to validate again (should fail)
      await expect(
        iotDataLedger.connect(deviceManager).validateData(
          deviceHash,
          timestamp
        )
      ).to.be.revertedWithCustomError(iotDataLedger, "AlreadyValidated");
    });
  });
}); 