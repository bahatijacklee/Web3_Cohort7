// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Update Chainlink imports to use the correct paths
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AccessManager.sol";
import "./TokenRewards.sol";
import "./IoTDataLedger.sol";

contract OracleIntegration is ChainlinkClient, ReentrancyGuard {
    using Chainlink for Chainlink.Request;

    struct VerificationRequest {
        bytes32 deviceHash;
        uint256 recordIndex;
        address disputer;
        bool resolved;
    }

    // Chainlink configuration
    address private oracleAddress;
    bytes32 private jobId;
    uint256 private fee;

    // Contract dependencies
    AccessManager public immutable accessManager;
    IoTDataLedger public immutable dataLedger;
    TokenRewards public immutable rewardToken;

    // State tracking
    mapping(bytes32 => VerificationRequest) public requests;
    mapping(bytes32 => mapping(uint256 => bool)) public validRecords;

    event VerificationRequested(
        bytes32 indexed requestId,
        bytes32 indexed deviceHash,
        uint256 recordIndex,
        address indexed disputer
    );
    
    event VerificationCompleted(
        bytes32 indexed requestId,
        bool isValid,
        address indexed validator
    );

    event DisputeResolved(
        bytes32 indexed deviceHash,
        uint256 recordIndex,
        bool finalValidity
    );

    constructor(
        address _accessManager,
        address _linkToken,
        address _oracle,
        bytes32 _jobId,
        uint256 _fee,
        address _dataLedger,
        address _rewardToken
    ) {
        accessManager = AccessManager(_accessManager);
        setChainlinkToken(_linkToken);
        setChainlinkOracle(_oracle);
        oracleAddress = _oracle;
        jobId = _jobId;
        fee = _fee;
        dataLedger = IoTDataLedger(_dataLedger);
        rewardToken = TokenRewards(_rewardToken);
    }

    modifier onlyAdmin() {
        require(accessManager.hasRole(accessManager.GLOBAL_ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }

    /**
     * @dev Initiate data verification through Chainlink oracle
     * @param deviceHash Target device identifier
     * @param recordIndex Data record index to verify
     * @param externalAPI API endpoint for validation
     */
    function requestDataVerification(
        bytes32 deviceHash,
        uint256 recordIndex,
        string calldata externalAPI
    ) external nonReentrant returns (bytes32 requestId) {
        require(!validRecords[deviceHash][recordIndex], "Already validated");
        
        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfillVerification.selector
        );
        
        req.add("method", "GET");
        req.add("url", externalAPI);
        req.add("path", "isValid");
        req.addInt("times", 1);
        
        requestId = sendChainlinkRequestTo(oracleAddress, req, fee);
        
        requests[requestId] = VerificationRequest({
            deviceHash: deviceHash,
            recordIndex: recordIndex,
            disputer: msg.sender,
            resolved: false
        });

        emit VerificationRequested(requestId, deviceHash, recordIndex, msg.sender);
    }

    /**
     * @dev Callback function for Chainlink oracle response
     * @param _requestId Request identifier
     * @param _isValid Validation result from oracle
     */
    function fulfillVerification(
        bytes32 _requestId,
        bool _isValid
    ) external recordChainlinkFulfillment(_requestId) {
        VerificationRequest storage request = requests[_requestId];
        require(!request.resolved, "Request already processed");
        
        validRecords[request.deviceHash][request.recordIndex] = _isValid;
        request.resolved = true;

        if (!_isValid) {
            rewardToken.slashRewards(request.deviceHash, tx.origin);
        }

        emit VerificationCompleted(_requestId, _isValid, tx.origin);
    }

    /**
     * @dev Admin override for disputed validations
     */
    function resolveDispute(
        bytes32 deviceHash,
        uint256 recordIndex,
        bool finalValidity
    ) external onlyAdmin {
        validRecords[deviceHash][recordIndex] = finalValidity;
        emit DisputeResolved(deviceHash, recordIndex, finalValidity);
    }

    // Configuration management
    function updateOracleConfig(
        address newOracle,
        bytes32 newJobId,
        uint256 newFee
    ) external onlyAdmin {
        setChainlinkOracle(newOracle);
        oracleAddress = newOracle;
        jobId = newJobId;
        fee = newFee;
    }

    function withdrawLink() external onlyAdmin {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }
}