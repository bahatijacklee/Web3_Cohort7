// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IDeviceRegistry {
    enum DeviceStatus { Inactive, Active, Suspended, Retired }

    function isDeviceActive(bytes32 deviceHash) external view returns (bool);
    function getDeviceOwner(bytes32 deviceHash) external view returns (address);
    function getDeviceStatus(bytes32 deviceHash) external view returns (DeviceStatus);
}