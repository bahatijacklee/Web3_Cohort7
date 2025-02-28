// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IDeviceRegistry.sol";
import "./AccessManager.sol";

contract IoTDataLedger is AccessControl, Pausable, ReentrancyGuard {
    struct DataRecord {
        bytes32 dataHash;
        bytes32 dataType;
        uint40 timestamp;
        address validator;
        bool isValidated;
    }

    AccessManager public immutable accessManager;
    IDeviceRegistry public immutable deviceRegistry;

    mapping(bytes32 => DataRecord[]) private _deviceRecords;
    mapping(bytes32 => uint256) private _validationCounts; // Added for efficiency

    error NotDataManager();
    error InvalidDevice();
    error InvalidData();
    error UnauthorizedAccess();
    error AlreadyValidated();

    constructor(address _accessManager, address _deviceRegistry) {
        accessManager = AccessManager(_accessManager);
        deviceRegistry = IDeviceRegistry(_deviceRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyDataManager() {
        if (!accessManager.hasRole(accessManager.DATA_MANAGER_ROLE(), msg.sender)) {
            revert NotDataManager();
        }
        _;
    }

    function recordData(
        bytes32 deviceHash,
        bytes32 dataType,
        bytes32 dataHash
    ) external whenNotPaused nonReentrant {
        _verifyDeviceAccess(deviceHash);
        _validateInput(dataType, dataHash);
        _storeRecord(deviceHash, dataType, dataHash);
    }

    function batchRecordData(
        bytes32[] calldata deviceHashes,
        bytes32[] calldata dataTypes,
        bytes32[] calldata dataHashes
    ) external whenNotPaused nonReentrant {
        uint256 length = deviceHashes.length;
        if (length != dataTypes.length || length != dataHashes.length) revert InvalidData();

        for (uint256 i = 0; i < length;) {
            _verifyDeviceAccess(deviceHashes[i]);
            _validateInput(dataTypes[i], dataHashes[i]);
            _storeRecord(deviceHashes[i], dataTypes[i], dataHashes[i]);
            unchecked { ++i; }
        }
    }

    function validateData(
        bytes32 deviceHash,
        uint40 timestamp
    ) external onlyDataManager nonReentrant {
        DataRecord[] storage records = _deviceRecords[deviceHash];
        bool found = false;
        
        for (uint256 i; i < records.length;) {
            if (records[i].timestamp == timestamp) {
                if (records[i].isValidated) revert AlreadyValidated();
                records[i].validator = msg.sender;
                records[i].isValidated = true;
                _validationCounts[deviceHash]++; // Increment counter
                found = true;
                emit DataValidated(deviceHash, timestamp, msg.sender);
                break;
            }
            unchecked { ++i; }
        }
        
        if (!found) revert InvalidData();
    }

    // Added helper for OracleIntegration
    function getTimestampByIndex(bytes32 deviceHash, uint256 index) external view returns (uint40) {
        DataRecord[] storage records = _deviceRecords[deviceHash];
        if (index >= records.length) return 0;
        return records[index].timestamp;
    }

    function getRecords(
        bytes32 deviceHash,
        uint256 start,
        uint256 count
    ) external view returns (DataRecord[] memory) {
        DataRecord[] storage records = _deviceRecords[deviceHash];
        uint256 end = start + count;
        end = end > records.length ? records.length : end;
        
        DataRecord[] memory result = new DataRecord[](end - start);
        for (uint256 i = start; i < end;) {
            result[i - start] = records[i];
            unchecked { ++i; }
        }
        return result;
    }

    function getValidationCount(bytes32 deviceHash) external view returns (uint256) {
        return _validationCounts[deviceHash];
    }

    function _verifyDeviceAccess(bytes32 deviceHash) internal view {
        if (!deviceRegistry.isDeviceActive(deviceHash)) revert InvalidDevice();
        if (deviceRegistry.getDeviceOwner(deviceHash) != msg.sender && 
            !accessManager.hasRole(accessManager.DATA_MANAGER_ROLE(), msg.sender)) {
            revert UnauthorizedAccess();
        }
    }

    function _validateInput(bytes32 dataType, bytes32 dataHash) internal pure {
        if (dataType == bytes32(0) || dataHash == bytes32(0)) revert InvalidData();
    }

    function _storeRecord(
        bytes32 deviceHash,
        bytes32 dataType,
        bytes32 dataHash
    ) internal {
        DataRecord memory newRecord = DataRecord({
            dataHash: dataHash,
            dataType: dataType,
            timestamp: uint40(block.timestamp),
            validator: address(0),
            isValidated: false
        });
        
        _deviceRecords[deviceHash].push(newRecord);
        emit DataRecorded(deviceHash, dataType, dataHash, newRecord.timestamp);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    event DataRecorded(
        bytes32 indexed deviceHash,
        bytes32 indexed dataType,
        bytes32 dataHash,
        uint40 timestamp
    );
    event DataValidated(
        bytes32 indexed deviceHash,
        uint40 timestamp,
        address validator
    );
}