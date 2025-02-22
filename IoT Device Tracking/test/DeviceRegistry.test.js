const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeviceRegistry", function () {
  let deviceRegistry;
  let owner;
  let deviceManager;
  let user;
  let deviceHash;
  
  beforeEach(async function () {
    // Get signers
    [owner, deviceManager, user] = await ethers.getSigners();
    
    // Deploy contract
    const DeviceRegistry = await ethers.getContractFactory("DeviceRegistry");
    deviceRegistry = await DeviceRegistry.deploy();
    await deviceRegistry.deployed();
    
    // Grant device manager role
    const DEVICE_MANAGER_ROLE = await deviceRegistry.DEVICE_MANAGER_ROLE();
    await deviceRegistry.grantRole(DEVICE_MANAGER_ROLE, deviceManager.address);
    
    // Create a test device hash
    deviceHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("testDevice"));
  });

  describe("Device Registration", function () {
    it("Should register a new device", async function () {
      const deviceType = "temperature_sensor";
      const manufacturer = "TestMfg";
      const model = "Test-01";
      const location = "Building A";
      
      // Create registration signature
      const domain = {
        name: "DeviceRegistry",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: deviceRegistry.address,
      };
      
      const types = {
        RegisterDevice: [
          { name: "deviceHash", type: "bytes32" },
          { name: "deviceType", type: "string" },
          { name: "manufacturer", type: "string" },
          { name: "model", type: "string" },
          { name: "location", type: "string" },
        ],
      };
      
      const value = {
        deviceHash: deviceHash,
        deviceType: deviceType,
        manufacturer: manufacturer,
        model: model,
        location: location,
      };
      
      // Sign with device manager
      const signature = await deviceManager._signTypedData(domain, types, value);
      
      // Register device
      await deviceRegistry.connect(user).registerDevice(
        deviceHash,
        deviceType,
        manufacturer,
        model,
        location,
        signature
      );
      
      // Get device details
      const devices = await deviceRegistry.getDevicesByOwnerPaginated(user.address, 0, 1);
      expect(devices.length).to.equal(1);
      expect(devices[0].deviceHash).to.equal(deviceHash);
      expect(devices[0].owner).to.equal(user.address);
      expect(devices[0].deviceType).to.equal(deviceType);
    });

    it("Should fail to register duplicate device", async function () {
      // First registration
      await deviceRegistry.connect(user).registerDevice(
        deviceHash,
        "temperature_sensor",
        "TestMfg",
        "Test-01",
        "Building A",
        "0x" // Empty signature for test
      );
      
      // Attempt duplicate registration
      await expect(
        deviceRegistry.connect(user).registerDevice(
          deviceHash,
          "temperature_sensor",
          "TestMfg",
          "Test-01",
          "Building A",
          "0x"
        )
      ).to.be.revertedWithCustomError(deviceRegistry, "DeviceExists");
    });
  });

  describe("Device Status Management", function () {
    beforeEach(async function () {
      // Register a device first
      await deviceRegistry.connect(user).registerDevice(
        deviceHash,
        "temperature_sensor",
        "TestMfg",
        "Test-01",
        "Building A",
        "0x"
      );
    });

    it("Should update device status", async function () {
      await deviceRegistry.connect(deviceManager).updateDeviceStatus(
        deviceHash,
        1 // Active status
      );
      
      const devices = await deviceRegistry.getDevicesByOwnerPaginated(user.address, 0, 1);
      expect(devices[0].status).to.equal(1);
    });

    it("Should batch update device statuses", async function () {
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
      
      // Batch update
      await deviceRegistry.connect(deviceManager).batchUpdateStatus(
        [deviceHash, deviceHash2],
        [1, 1] // Both Active
      );
      
      const devices = await deviceRegistry.getDevicesByOwnerPaginated(user.address, 0, 2);
      expect(devices[0].status).to.equal(1);
      expect(devices[1].status).to.equal(1);
    });
  });
}); 