// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IIoTDataLedger.sol";
import "./AccessManager.sol";

contract TokenRewards is ERC20, ReentrancyGuard {
    // Custom errors
    error NotAdmin();
    error NotOracle();
    error NoRewardsAvailable();
    error InvalidPercentage();

    AccessManager public immutable accessManager;
    IIoTDataLedger public immutable dataLedger;
    
    // Pack related variables
    struct RewardConfig {
        uint128 rewardRate;
        uint128 slashPercentage;
    }
    
    RewardConfig private _config;
    
    // Optimized storage layout
    mapping(address => uint256) public slashedBalances;
    mapping(bytes32 => mapping(address => uint256)) private _claimedRewards;

    event RewardsClaimed(address indexed operator, uint256 amount);
    event RewardsSlashed(address indexed operator, uint256 amount);
    event RewardRateUpdated(uint256 newRate);
    event SlashPercentageUpdated(uint256 newPercentage);

    constructor(address _accessManager, address _dataLedger) ERC20("IoT Data Credits", "IDC") {
        accessManager = AccessManager(_accessManager);
        dataLedger = IIoTDataLedger(_dataLedger);
        _config.rewardRate = 1 ether;
        _config.slashPercentage = 10;
    }

    modifier onlyAdmin() {
        if (!accessManager.hasRole(accessManager.GLOBAL_ADMIN_ROLE(), msg.sender)) {
            revert NotAdmin();
        }
        _;
    }

    modifier onlyOracle() {
        if (!accessManager.hasRole(accessManager.ORACLE_ROLE(), msg.sender)) {
            revert NotOracle();
        }
        _;
    }

    /**
     * @dev Users manually claim their rewards based on valid IoT data.
     * @param deviceHash Hashed device identifier.
     */
    function claimRewards(bytes32 deviceHash) external nonReentrant {
        uint256 claimableAmount = calculateRewards(deviceHash, msg.sender);
        require(claimableAmount > 0, "No rewards available");

        _claimedRewards[deviceHash][msg.sender] += claimableAmount;
        _mint(msg.sender, claimableAmount);

        emit RewardsClaimed(msg.sender, claimableAmount);
    }

    /**
     * @dev Calculates unclaimed rewards for a user.
     * @param deviceHash Hashed device identifier.
     * @param operator Address to calculate rewards for.
     * @return uint256 Unclaimed reward amount.
     */
    function calculateRewards(bytes32 deviceHash, address operator) 
        public 
        view 
        returns (uint256) 
    {
        uint256 validRecords = dataLedger.getValidationCount(deviceHash);
        return (validRecords * _config.rewardRate) - _claimedRewards[deviceHash][operator];
    }

    /**
     * @dev Slashes rewards for invalid data reports (oracle-only).
     * @param deviceHash Hashed device identifier.
     * @param operator Operator address to penalize.
     */
    function slashRewards(bytes32 deviceHash, address operator) 
        external 
        onlyOracle 
        nonReentrant 
    {
        uint256 balance = balanceOf(operator);
        uint256 slashAmount = (balance * _config.slashPercentage) / 100;

        _burn(operator, slashAmount);
        slashedBalances[operator] += slashAmount;

        emit RewardsSlashed(operator, slashAmount);
    }

    // 🔹 Admin Functions (Platform Configuration)

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
        require(newPercentage <= 100, "Invalid percentage");
        _config.slashPercentage = uint128(newPercentage);
        emit SlashPercentageUpdated(newPercentage);
    }

    // 🔹 Read-Only Functions (For Frontend Tracking)

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

    // Override decimals for precision
    function decimals() public pure override returns (uint8) {
        return 6; // 6 decimal places for microcredits
    }
}
