// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/**
 * @title AccessManager
 * @dev Centralized role management for the IoT system
 */
contract AccessManager is AccessControlEnumerable {
    // Role constants
    bytes32 public constant GLOBAL_ADMIN_ROLE = keccak256("GLOBAL_ADMIN");
    bytes32 public constant DEVICE_MANAGER_ROLE = keccak256("DEVICE_MANAGER");
    bytes32 public constant DATA_MANAGER_ROLE = keccak256("DATA_MANAGER");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GLOBAL_ADMIN_ROLE, msg.sender);
        
        // Batch setup role admins
        bytes32[] memory roles = new bytes32[](4);
        roles[0] = GLOBAL_ADMIN_ROLE;
        roles[1] = DEVICE_MANAGER_ROLE;
        roles[2] = DATA_MANAGER_ROLE;
        roles[3] = ORACLE_ROLE;
        
        for (uint256 i = 0; i < roles.length;) {
            _setRoleAdmin(roles[i], i == 0 ? DEFAULT_ADMIN_ROLE : GLOBAL_ADMIN_ROLE);
            unchecked { ++i; }
        }
    }

    /**
     * @dev Grants a role with validation
     * @notice Restricts to predefined roles only
     */
    function grantRole(bytes32 role, address account) 
        public 
        virtual 
        override(AccessControl, IAccessControl) // Explicitly override both
    {
        if (role != DEVICE_MANAGER_ROLE && 
            role != DATA_MANAGER_ROLE && 
            role != ORACLE_ROLE && 
            role != GLOBAL_ADMIN_ROLE && 
            role != DEFAULT_ADMIN_ROLE) {
            revert("Use predefined roles only");
        }
        super.grantRole(role, account);
    }
}