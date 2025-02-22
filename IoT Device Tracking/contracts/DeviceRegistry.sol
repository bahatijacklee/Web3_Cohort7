// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AccessManager.sol";

/**
 * @title DeviceRegistry
 * @dev Professional-grade IoT device management with gas optimization and advanced features
 */
contract DeviceRegistry is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    AccessManager public immutable accessManager;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEVICE_MANAGER_ROLE = keccak256("DEVICE_MANAGER");
    bytes32 private constant REGISTER_TYPEHASH = 
        keccak256("RegisterDevice(bytes32 deviceHash,string deviceType,string manufacturer,string model,string location)");

    enum DeviceStatus { Inactive, Active, Suspended, Retired }

    // Optimized storage layout
    struct Device {
        address owner;
        DeviceStatus status;
        uint40 registrationDate;
        uint40 lastUpdated;
        string deviceType;     // Consider using bytes32 for fixed-size types
        string manufacturer;
        string model;
        string location;
    }

    struct DeviceView {
        bytes32 deviceHash;
        address owner;
        DeviceStatus status;
        uint256 registrationDate;
        uint256 lastUpdated;
        string deviceType;
        string manufacturer;    // New field
        string model;           // New field
        string location;        // New field
    }

    // Packed mappings
    mapping(bytes32 => Device) private _devices;
    mapping(address => bytes32[]) private _ownerDevices;
    mapping(bytes32 => address) private _deviceOwners;
    mapping(string => uint256) private _deviceTypeCounts;
    
    constructor(address _accessManager) EIP712("DeviceRegistry", "1.0") {
        accessManager = AccessManager(_accessManager);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(DEVICE_MANAGER_ROLE, ADMIN_ROLE);
    }

    // Events (indexed for efficient filtering)
    event DeviceRegistered(
        bytes32 indexed deviceHash,
        address indexed owner,
        string deviceType,
        uint256 timestamp
    );
    event DeviceStatusUpdated(
        bytes32 indexed deviceHash,
        DeviceStatus newStatus,
        address indexed updatedBy,
        uint256 timestamp
    );
    event DeviceOwnershipTransferred(
        bytes32 indexed deviceHash,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );
    event DeviceRetired(bytes32 indexed deviceHash, uint256 timestamp);

    // Custom errors for gas optimization
    error DeviceExists();
    error DeviceNotFound();
    error Unauthorized();
    error InvalidDeviceType();
    error InvalidSignature();
    error ArrayLengthMismatch();
    error NotAdmin();
    error NotDeviceManager();

    modifier onlyAdmin() {
        if (!accessManager.hasRole(accessManager.GLOBAL_ADMIN_ROLE(), msg.sender)) {
            revert NotAdmin();
        }
        _;
    }

    modifier onlyDeviceManager() {
        if (!accessManager.hasRole(accessManager.DEVICE_MANAGER_ROLE(), msg.sender)) {
            revert NotDeviceManager();
        }
        _;
    }

    modifier onlyDeviceOwner(bytes32 deviceHash) {
        if (_deviceOwners[deviceHash] != msg.sender) revert Unauthorized();
        _;
    }

    // Core Functions

    /// @notice Registers a new device with EIP-712 signature support
    function registerDevice(
        bytes32 deviceHash,
        string calldata deviceType,
        string calldata manufacturer,
        string calldata model,
        string calldata location,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        _validateRegistration(deviceHash, deviceType, manufacturer, model, location, signature);
        _executeRegistration(deviceHash, deviceType, manufacturer, model, location, msg.sender);
    }

    /// @notice Batch update device statuses (admin only)
    function batchUpdateStatus(
        bytes32[] calldata deviceHashes,
        DeviceStatus[] calldata newStatuses
    ) external onlyDeviceManager {
        uint256 length = deviceHashes.length;
        if (length != newStatuses.length) revert ArrayLengthMismatch();
        
        for (uint256 i; i < length; ) {
            Device storage device = _devices[deviceHashes[i]];
            if (device.registrationDate == 0) revert DeviceNotFound();
            
            device.status = newStatuses[i];
            device.lastUpdated = uint40(block.timestamp);
            
            emit DeviceStatusUpdated(deviceHashes[i], newStatuses[i], msg.sender, block.timestamp);
            unchecked { ++i; }
        }
    }

    /// @notice Transfer ownership of a device
    function transferOwnership(bytes32 deviceHash, address newOwner) 
        external 
        onlyDeviceOwner(deviceHash) 
        whenNotPaused 
        nonReentrant 
    {
        address previousOwner = _deviceOwners[deviceHash];
        _deviceOwners[deviceHash] = newOwner;
        _devices[deviceHash].owner = newOwner;
        _devices[deviceHash].lastUpdated = uint40(block.timestamp);

        // Remove device from previous owner's list
        bytes32[] storage prevOwnerDevices = _ownerDevices[previousOwner];
        for (uint256 i; i < prevOwnerDevices.length; ) {
            if (prevOwnerDevices[i] == deviceHash) {
                prevOwnerDevices[i] = prevOwnerDevices[prevOwnerDevices.length - 1];
                prevOwnerDevices.pop();
                break;
            }
            unchecked { ++i; }
        }

        // Add device to new owner's list
        _ownerDevices[newOwner].push(deviceHash);

        emit DeviceOwnershipTransferred(deviceHash, previousOwner, newOwner, block.timestamp);
    }

    /// @notice Update the status of a single device
    function updateDeviceStatus(bytes32 deviceHash, DeviceStatus newStatus) 
        external 
        onlyDeviceManager 
        whenNotPaused 
    {
        Device storage device = _devices[deviceHash];
        if (device.registrationDate == 0) revert DeviceNotFound();
        
        device.status = newStatus;
        device.lastUpdated = uint40(block.timestamp);
        emit DeviceStatusUpdated(deviceHash, newStatus, msg.sender, block.timestamp);
    }

    /// @notice Retire a device (mark as no longer in use)
    function retireDevice(bytes32 deviceHash) 
        external 
        onlyDeviceOwner(deviceHash) 
        whenNotPaused 
        nonReentrant 
    {
        Device storage device = _devices[deviceHash];
        if (device.registrationDate == 0) revert DeviceNotFound();
        
        device.status = DeviceStatus.Retired;
        device.lastUpdated = uint40(block.timestamp);
        emit DeviceRetired(deviceHash, block.timestamp);
    }

    // View Functions

    /// @notice Get paginated devices for an owner
    function getDevicesByOwnerPaginated(
        address owner,
        uint256 page,
        uint256 pageSize
    ) external view returns (DeviceView[] memory) {
        bytes32[] storage hashes = _ownerDevices[owner];
        uint256 start = page * pageSize;
        uint256 end = start + pageSize;
        end = end > hashes.length ? hashes.length : end;
        
        DeviceView[] memory result = new DeviceView[](end - start);
        for (uint256 i = start; i < end; ) {
            bytes32 dh = hashes[i];
            Device storage d = _devices[dh];
            result[i - start] = DeviceView({
                deviceHash: dh,
                owner: d.owner,
                status: d.status,
                registrationDate: d.registrationDate,
                lastUpdated: d.lastUpdated,
                deviceType: d.deviceType,
                manufacturer: d.manufacturer,
                model: d.model,
                location: d.location
            });
            unchecked { ++i; }
        }
        return result;
    }

    // Internal Helpers

    function _validateRegistration(
        bytes32 deviceHash,
        string calldata deviceType,
        string calldata manufacturer,
        string calldata model,
        string calldata location,
        bytes calldata signature
    ) private view {
        if (bytes(deviceType).length == 0 || bytes(deviceType).length > 64) revert InvalidDeviceType();
        if (bytes(manufacturer).length > 64) revert InvalidDeviceType();
        if (bytes(model).length > 64) revert InvalidDeviceType();
        if (bytes(location).length > 64) revert InvalidDeviceType();
        if (_devices[deviceHash].registrationDate != 0) revert DeviceExists();
        
        if (signature.length > 0) {
            bytes32 digest = _hashTypedDataV4(
                keccak256(abi.encode(
                    REGISTER_TYPEHASH,
                    deviceHash,
                    keccak256(bytes(deviceType)),
                    keccak256(bytes(manufacturer)),
                    keccak256(bytes(model)),
                    keccak256(bytes(location))
                ))
            );
            address signer = digest.recover(signature);
            if (!hasRole(DEVICE_MANAGER_ROLE, signer)) revert InvalidSignature();
        }
    }

    function _executeRegistration(
        bytes32 deviceHash,
        string calldata deviceType,
        string calldata manufacturer,
        string calldata model,
        string calldata location,
        address owner
    ) private {
        Device memory newDevice = Device({
            owner: owner,
            status: DeviceStatus.Active,
            registrationDate: uint40(block.timestamp),
            lastUpdated: uint40(block.timestamp),
            deviceType: deviceType,
            manufacturer: manufacturer,
            model: model,
            location: location
        });

        _devices[deviceHash] = newDevice;
        _ownerDevices[owner].push(deviceHash);
        _deviceOwners[deviceHash] = owner;
        _deviceTypeCounts[deviceType]++;

        emit DeviceRegistered(deviceHash, owner, deviceType, block.timestamp);
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }
}