// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IIoTDataLedger.sol";

contract MockDataLedger is IIoTDataLedger {
    // Use the DataRecord struct from the interface
    mapping(bytes32 => DataRecord[]) private _records;
    mapping(bytes32 => uint256) private _validationCounts;

    function recordData(
        bytes32 deviceHash,
        bytes32 dataType,
        bytes32 dataHash
    ) external override {
        DataRecord memory newRecord = DataRecord({
            dataHash: dataHash,
            dataType: dataType,
            timestamp: uint40(block.timestamp),
            validator: address(0)
        });
        _records[deviceHash].push(newRecord);
    }

    function batchRecordData(
        bytes32[] calldata deviceHashes,
        bytes32[] calldata dataTypes,
        bytes32[] calldata dataHashes
    ) external override {
        require(
            deviceHashes.length == dataTypes.length &&
            dataTypes.length == dataHashes.length,
            "Length mismatch"
        );
        
        for (uint256 i = 0; i < deviceHashes.length; i++) {
            this.recordData(deviceHashes[i], dataTypes[i], dataHashes[i]);
        }
    }

    function validateData(
        bytes32 deviceHash,
        uint40 timestamp
    ) external override {
        _validationCounts[deviceHash]++;
        
        DataRecord[] storage records = _records[deviceHash];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp == timestamp) {
                records[i].validator = msg.sender;
                break;
            }
        }
    }

    function getRecords(
        bytes32 deviceHash,
        uint256 start,
        uint256 count
    ) external view override returns (DataRecord[] memory) {
        DataRecord[] storage allRecords = _records[deviceHash];
        uint256 end = start + count;
        if (end > allRecords.length) {
            end = allRecords.length;
        }
        
        DataRecord[] memory result = new DataRecord[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = allRecords[i];
        }
        return result;
    }

    function getValidationCount(bytes32 deviceHash) external view override returns (uint256) {
        return _validationCounts[deviceHash];
    }

    // Mock helper functions
    function setValidationCount(bytes32 deviceHash, uint256 count) external {
        _validationCounts[deviceHash] = count;
    }
}