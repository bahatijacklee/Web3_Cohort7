// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract AccessManager is AccessControlEnumerable {
    bytes32 public constant GLOBAL_ADMIN_ROLE = keccak256("GLOBAL_ADMIN");
    bytes32 public constant DEVICE_MANAGER_ROLE = keccak256("DEVICE_MANAGER");
    bytes32 public constant DATA_MANAGER_ROLE = keccak256("DATA_MANAGER");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GLOBAL_ADMIN_ROLE, msg.sender);
        
        // Batch set role admins to save gas
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

    // Optimized grantRole function that we fixed earlier
    function grantRole(bytes32 role, address account) 
        public 
        virtual 
        override(AccessControl, IAccessControl) 
    {
        // Use custom error instead of require to save gas
        if (role != DEVICE_MANAGER_ROLE && 
            role != DATA_MANAGER_ROLE && 
            role != ORACLE_ROLE && 
            role != GLOBAL_ADMIN_ROLE && 
            role != DEFAULT_ADMIN_ROLE) {
            revert("Use device-specific roles");
        }
        super.grantRole(role, account);
    }

    // Rest of your functions remain the same...
}
