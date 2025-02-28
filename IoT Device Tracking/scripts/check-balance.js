const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Fetch ETH balance
  const ethBalance = await deployer.getBalance();
  
  // LINK token contract address from .env
  const linkTokenAddress = process.env.CHAINLINK_TOKEN || "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Fallback if env missing
  
  // Minimal ABI for ERC20 balanceOf function
  const linkAbi = [
    "function balanceOf(address account) external view returns (uint256)"
  ];
  
  // Create contract instance for LINK token
  const linkContract = new ethers.Contract(linkTokenAddress, linkAbi, deployer);
  
  // Fetch LINK balance
  const linkBalance = await linkContract.balanceOf(deployer.address);
  
  // Display balances
  console.log("Account address:", deployer.address);
  console.log("Account ETH balance:", ethers.utils.formatEther(ethBalance), "ETH");
  console.log("Account LINK balance:", ethers.utils.formatEther(linkBalance), "LINK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });