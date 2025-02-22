// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IIoTDataLedger {
    struct DataRecord {
        bytes32 dataHash;     // Hash of sensor data
        bytes32 dataType;     // Type identifier (e.g., keccak256("TEMPERATURE"))
        uint40 timestamp;     // Packed timestamp
        address validator;    // Address that validated the data
    }

    function recordData(
        bytes32 deviceHash,
        bytes32 dataType,
        bytes32 dataHash
    ) external;

    function batchRecordData(
        bytes32[] calldata deviceHashes,
        bytes32[] calldata dataTypes,
        bytes32[] calldata dataHashes
    ) external;

    function validateData(
        bytes32 deviceHash,
        uint40 timestamp
    ) external;

    function getRecords(
        bytes32 deviceHash,
        uint256 start,
        uint256 count
    ) external view returns (DataRecord[] memory);

    function getValidationCount(bytes32 deviceHash) external view returns (uint256);
} 