import { ethers, Wallet } from "ethers";
import * as dotenv from 'dotenv';

dotenv.config();

import bookStore from './ABI/BookStore.json' with { type: 'json' }; // Corrected import

const createContractInstanceOnEthereum = (contractAddress, contractAbi) => {
    const alchemyApiKey = process.env.ALCHEMY_API_KEY_SEPOLIA;
    const provider = new ethers.AlchemyProvider('sepolia', alchemyApiKey);

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    const wallet = new Wallet(privateKey, provider);

    const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

    return contract;
};

const contractAddress = '0xdb2c57a7FA682780a6219A3AD18fc71B2C170E44';
const contractOnETH = createContractInstanceOnEthereum(contractAddress, bookStore.abi);

(async () => {
    try {
        console.log("Contract instance created:", contractOnETH);
    } catch (error) {
        console.error("Error creating contract instance:", error);
    }
})();
