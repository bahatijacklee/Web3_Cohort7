// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
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
        uint256 timestamp;
    }

    address private oracleAddress;
    bytes32 private jobId;
    uint256 private fee;

    AccessManager public immutable accessManager;
    IoTDataLedger public immutable dataLedger;
    TokenRewards public immutable rewardToken;

    mapping(bytes32 => VerificationRequest) public requests; // Key: keccak256(deviceHash, recordIndex)
    mapping(bytes32 => mapping(uint256 => bool)) public validRecords;
    mapping(bytes32 => bytes32) public requestIdToKey;

    event VerificationRequested(bytes32 indexed requestId, bytes32 indexed deviceHash, uint256 recordIndex, address indexed disputer);
    event VerificationCompleted(bytes32 indexed requestId, bool isValid, address indexed validator);
    event DisputeResolved(bytes32 indexed deviceHash, uint256 recordIndex, bool finalValidity, address indexed resolver);

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

    function requestDataVerification(
        bytes32 deviceHash,
        uint256 recordIndex,
        string calldata externalAPI
    ) external nonReentrant returns (bytes32 requestId) {
        require(!validRecords[deviceHash][recordIndex], "Already validated");
        bytes32 requestKey = keccak256(abi.encode(deviceHash, recordIndex));
        require(!requests[requestKey].resolved, "Request already exists and resolved");

        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfillVerification.selector);
        req.add("method", "GET");
        req.add("url", externalAPI);
        req.add("path", "isValid");
        req.addInt("times", 1);
        
        requestId = sendChainlinkRequestTo(oracleAddress, req, fee);
        
        requests[requestKey] = VerificationRequest({
            deviceHash: deviceHash,
            recordIndex: recordIndex,
            disputer: msg.sender,
            resolved: false,
            timestamp: block.timestamp
        });
        requestIdToKey[requestId] = requestKey;

        emit VerificationRequested(requestId, deviceHash, recordIndex, msg.sender);
    }

    function fulfillVerification(bytes32 _requestId, bool _isValid) external recordChainlinkFulfillment(_requestId) {
        bytes32 requestKey = requestIdToKey[_requestId];
        VerificationRequest storage request = requests[requestKey];
        require(!request.resolved, "Request already processed");
        
        validRecords[request.deviceHash][request.recordIndex] = _isValid;
        request.resolved = true;

        if (accessManager.hasRole(accessManager.DATA_MANAGER_ROLE(), address(this))) {
            uint40 timestamp = dataLedger.getTimestampByIndex(request.deviceHash, request.recordIndex);
            if (timestamp != 0) {
                dataLedger.validateData(request.deviceHash, timestamp);
            }
        }

        if (!_isValid) {
            rewardToken.slashRewards(request.deviceHash, request.disputer);
        }

        emit VerificationCompleted(_requestId, _isValid, tx.origin);
        delete requestIdToKey[_requestId];
    }

    function resolveDispute(bytes32 deviceHash, uint256 recordIndex, bool finalValidity) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        bytes32 requestKey = keccak256(abi.encode(deviceHash, recordIndex));
        VerificationRequest storage request = requests[requestKey];
        require(request.disputer != address(0), "No verification request found");
        require(!request.resolved, "Already resolved");
        require(block.timestamp >= request.timestamp + 1 hours, "Timeout not reached");

        validRecords[deviceHash][recordIndex] = finalValidity;
        request.resolved = true;

        if (accessManager.hasRole(accessManager.DATA_MANAGER_ROLE(), address(this))) {
            uint40 timestamp = dataLedger.getTimestampByIndex(deviceHash, recordIndex);
            if (timestamp != 0) {
                dataLedger.validateData(deviceHash, timestamp);
            }
        }

        if (!finalValidity) {
            rewardToken.slashRewards(deviceHash, request.disputer);
        }

        emit DisputeResolved(deviceHash, recordIndex, finalValidity, msg.sender);
    }

    function updateOracleConfig(address newOracle, bytes32 newJobId, uint256 newFee) external onlyAdmin {
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