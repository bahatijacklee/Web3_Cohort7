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
 * @dev Manages IoT device lifecycle with ownership, status, and EIP-712 signatures
 */
contract DeviceRegistry is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    // Immutable reference to AccessManager for role checks
    AccessManager public immutable accessManager;
    
    // Role constants (mirrored from AccessManager for clarity)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEVICE_MANAGER_ROLE = keccak256("DEVICE_MANAGER");
    
    // EIP-712 typehash for signed registrations
    bytes32 private constant REGISTER_TYPEHASH = 
        keccak256("RegisterDevice(bytes32 deviceHash,string deviceType,string manufacturer,string model,string location)");

    // Device status enum
    enum DeviceStatus { Inactive, Active, Suspended, Retired }

    // Optimized device struct with packed fields
    struct Device {
        address owner;         // Device owner
        DeviceStatus status;   // Current status
        uint40 registrationDate; // Timestamp of registration
        uint40 lastUpdated;    // Last update timestamp
        string deviceType;     // Device type (e.g., "sensor")
        string manufacturer;   // Manufacturer name
        string model;          // Model identifier
        string location;       // Physical location
    }

    struct DeviceView {
        bytes32 deviceHash;
        address owner;
        DeviceStatus status;
        uint256 registrationDate;
        uint256 lastUpdated;
        string deviceType;
        string manufacturer;
        string model;
        string location;
    }

    // Storage mappings
    mapping(bytes32 => Device) private _devices;               // Device data by hash
    mapping(address => bytes32[]) private _ownerDevices;       // Devices per owner
    mapping(bytes32 => address) private _deviceOwners;         // Quick owner lookup
    mapping(string => uint256) private _deviceTypeCounts;      // Count of devices by type

    // Events for tracking
    event DeviceRegistered(bytes32 indexed deviceHash, address indexed owner, string deviceType, uint256 timestamp);
    event DeviceStatusUpdated(bytes32 indexed deviceHash, DeviceStatus newStatus, address indexed updatedBy, uint256 timestamp);
    event DeviceOwnershipTransferred(bytes32 indexed deviceHash, address indexed previousOwner, address indexed newOwner, uint256 timestamp);
    event DeviceRetired(bytes32 indexed deviceHash, uint256 timestamp);

    // Custom errors for gas efficiency
    error DeviceExists();
    error DeviceNotFound();
    error Unauthorized();
    error InvalidDeviceType();
    error InvalidSignature();
    error ArrayLengthMismatch();
    error NotAdmin();
    error NotDeviceManager();

    constructor(address _accessManager) EIP712("DeviceRegistry", "1.0") {
        accessManager = AccessManager(_accessManager);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(DEVICE_MANAGER_ROLE, ADMIN_ROLE);
    }

    modifier onlyAdmin() {
        if (!accessManager.hasRole(accessManager.GLOBAL_ADMIN_ROLE(), msg.sender)) revert NotAdmin();
        _;
    }

    modifier onlyDeviceManager() {
        if (!accessManager.hasRole(accessManager.DEVICE_MANAGER_ROLE(), msg.sender)) revert NotDeviceManager();
        _;
    }

    modifier onlyDeviceOwner(bytes32 deviceHash) {
        if (_deviceOwners[deviceHash] != msg.sender) revert Unauthorized();
        _;
    }

    /**
     * @dev Registers a device with optional EIP-712 signature
     */
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

    /**
     * @dev Batch updates device statuses (DEVICE_MANAGER only)
     */
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

    /**
     * @dev Transfers device ownership
     */
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

        bytes32[] storage prevOwnerDevices = _ownerDevices[previousOwner];
        for (uint256 i; i < prevOwnerDevices.length; ) {
            if (prevOwnerDevices[i] == deviceHash) {
                prevOwnerDevices[i] = prevOwnerDevices[prevOwnerDevices.length - 1];
                prevOwnerDevices.pop();
                break;
            }
            unchecked { ++i; }
        }

        _ownerDevices[newOwner].push(deviceHash);
        emit DeviceOwnershipTransferred(deviceHash, previousOwner, newOwner, block.timestamp);
    }

    /**
     * @dev Updates a single device status (DEVICE_MANAGER only)
     */
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

    /**
     * @dev Retires a device (owner only)
     */
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

    /**
     * @dev Gets paginated devices for an owner (for frontend)
     */
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

    // Internal helpers
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