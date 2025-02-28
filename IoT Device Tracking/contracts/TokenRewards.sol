// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IIoTDataLedger.sol";
import "./AccessManager.sol";

/**
 * @title TokenRewards
 * @dev ERC20 token for rewarding valid IoT data with slashing mechanism
 */
contract TokenRewards is ERC20, ReentrancyGuard {
    // Custom errors
    error NotAdmin();
    error NotOracle();
    error NoRewardsAvailable();
    error InvalidPercentage();

    // Immutable dependencies
    AccessManager public immutable accessManager;
    IIoTDataLedger public immutable dataLedger;
    address public immutable oracleIntegration;

    struct RewardConfig {
        uint128 rewardRate;
        uint128 slashPercentage;
    }
    
    RewardConfig private _config;
    
    mapping(address => uint256) public slashedBalances;
    mapping(bytes32 => mapping(address => uint256)) private _claimedRewards;

    event RewardsClaimed(address indexed operator, uint256 amount);
    event RewardsSlashed(address indexed operator, uint256 amount);
    event RewardRateUpdated(uint256 newRate);
    event SlashPercentageUpdated(uint256 newPercentage);

    constructor(address _accessManager, address _dataLedger, address _oracleIntegration) 
        ERC20("IoT Data Credits", "IDC") 
    {
        accessManager = AccessManager(_accessManager);
        dataLedger = IIoTDataLedger(_dataLedger);
        oracleIntegration = _oracleIntegration;
        _config.rewardRate = 1 ether;
        _config.slashPercentage = 10;
    }

    modifier onlyAdmin() {
        if (!accessManager.hasRole(accessManager.GLOBAL_ADMIN_ROLE(), msg.sender)) revert NotAdmin();
        _;
    }

    modifier onlyOracle() {
        if (!accessManager.hasRole(accessManager.ORACLE_ROLE(), msg.sender)) revert NotOracle();
        _;
    }

    function claimRewards(bytes32 deviceHash) external nonReentrant {
        uint256 claimableAmount = calculateRewards(deviceHash, msg.sender);
        if (claimableAmount == 0) revert NoRewardsAvailable();

        _claimedRewards[deviceHash][msg.sender] += claimableAmount;
        _mint(msg.sender, claimableAmount);
        emit RewardsClaimed(msg.sender, claimableAmount);
    }

    function calculateRewards(bytes32 deviceHash, address operator) 
        public 
        view 
        returns (uint256) 
    {
        uint256 validRecords = dataLedger.getValidationCount(deviceHash);
        return (validRecords * _config.rewardRate) - _claimedRewards[deviceHash][operator];
    }

    function slashRewards(bytes32, address operator) // Removed parameter name to silence warning
        external 
        onlyOracle 
        nonReentrant 
    {
        uint256 balance = balanceOf(operator);
        uint256 slashAmount = (balance * _config.slashPercentage) / 100;
        if (slashAmount > balance) slashAmount = balance;

        _burn(operator, slashAmount);
        slashedBalances[operator] += slashAmount;
        emit RewardsSlashed(operator, slashAmount);
    }

    function setRewardRate(uint256 newRate) 
        external 
        onlyAdmin 
    {
        _config.rewardRate = uint128(newRate);
        emit RewardRateUpdated(newRate);
    }

    function setSlashPercentage(uint256 newPercentage) 
        external 
        onlyAdmin 
    {
        if (newPercentage > 100) revert InvalidPercentage();
        _config.slashPercentage = uint128(newPercentage);
        emit SlashPercentageUpdated(newPercentage);
    }

    function getUserBalance(address user) 
        public 
        view 
        returns (uint256) 
    {
        return balanceOf(user);
    }

    function getSlashedBalance(address user) 
        public 
        view 
        returns (uint256) 
    {
        return slashedBalances[user];
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}