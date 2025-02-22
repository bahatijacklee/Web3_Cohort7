// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IDeviceRegistry.sol";

contract MockRegistry is IDeviceRegistry {
    mapping(bytes32 => bool) private _activeDevices;
    mapping(bytes32 => address) private _deviceOwners;
    mapping(bytes32 => DeviceStatus) private _deviceStatuses;

    function isDeviceActive(bytes32 deviceHash) external view override returns (bool) {
        return _activeDevices[deviceHash];
    }

    function getDeviceOwner(bytes32 deviceHash) external view override returns (address) {
        return _deviceOwners[deviceHash];
    }

    function getDeviceStatus(bytes32 deviceHash) external view override returns (DeviceStatus) {
        return _deviceStatuses[deviceHash];
    }

    // Helper functions for testing
    function setDeviceActive(bytes32 deviceHash, bool isActive) external {
        _activeDevices[deviceHash] = isActive;
    }

    function setDeviceOwner(bytes32 deviceHash, address owner) external {
        _deviceOwners[deviceHash] = owner;
    }

    function setDeviceStatus(bytes32 deviceHash, DeviceStatus status) external {
        _deviceStatuses[deviceHash] = status;
    }

    function mockRegisterDevice(
        bytes32 deviceHash,
        address owner,
        DeviceStatus status
    ) external {
        _activeDevices[deviceHash] = status == DeviceStatus.Active;
        _deviceOwners[deviceHash] = owner;
        _deviceStatuses[deviceHash] = status;
    }
}