'use client';

import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite, useWatchContractEvent } from 'wagmi'; // Updated import
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast'; // Correct import for shadcn/ui toast
import tokenRewardsAbi from '@/abis/TokenRewards.json'; // Adjust path if needed
import { formatUnits, keccak256, stringToHex } from 'viem';

const TOKEN_REWARDS = "0xca276186Eb9f3a58FCdfc4adA247Cbe8d935778a";

export default function Rewards() {
  const { isConnected, address } = useAccount();
  const { toast } = useToast(); // Use shadcn/ui’s useToast hook

  // Fetch balance (available rewards)
  const { data: balance, isLoading: balanceLoading } = useContractRead({
    address: TOKEN_REWARDS as `0x${string}`,
    abi: tokenRewardsAbi.abi,
    functionName: 'getUserBalance',
    args: [address],
    enabled: isConnected && !!address,
  });

  // Track claimed rewards via events (simplified)
  const [claimedRewards, setClaimedRewards] = useState<bigint>(0n);

  // Use useWatchContractEvent instead of useContractEvent
  useWatchContractEvent({
    address: TOKEN_REWARDS as `0x${string}`,
    abi: tokenRewardsAbi.abi,
    eventName: 'RewardsClaimed',
    onLogs(logs) {
      logs.forEach((log) => {
        const [operator, amount] = log.args as [string, bigint];
        if (operator === address) {
          setClaimedRewards((prev) => prev + amount);
          toast({
            title: `Claimed ${formatUnits(amount, 6)} IDC for ${operator}`,
            variant: 'success',
          });
        }
      });
    },
  });

  // Claim rewards (using a hardcoded deviceHash for now)
  const { writeAsync: claimRewards, isPending: isClaimLoading } = useContractWrite({
    address: TOKEN_REWARDS as `0x${string}`,
    abi: tokenRewardsAbi.abi,
    functionName: 'claimRewards',
  });

  const handleClaimRewards = async () => {
    try {
      const deviceHash = keccak256(stringToHex("device1")); // Example deviceHash
      const tx = await claimRewards({ args: [deviceHash] });
      toast({
        title: 'Claiming rewards...',
        variant: 'default',
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        toast({
          title: 'Rewards claimed successfully!',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Transaction failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to claim rewards',
        variant: 'destructive',
      });
      console.error('Error claiming rewards:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Please connect your wallet to view and claim rewards</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <h1 className="text-4xl font-bold flex items-center">
          <Gift className="mr-2" /> IoT Rewards
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-2">Available Rewards</h2>
            <p className="text-3xl font-bold text-blue-600">
              {balanceLoading ? '...' : formatUnits(balance || 0n, 6)} IDC
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-2">Total Rewards</h2>
            <p className="text-3xl font-bold text-purple-600">
              {balanceLoading ? '...' : formatUnits((balance || 0n) + (claimedRewards || 0n), 6)} IDC
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-2">Claimed Rewards</h2>
            <p className="text-3xl font-bold text-green-600">
              {balanceLoading ? '...' : formatUnits(claimedRewards || 0n, 6)} IDC
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleClaimRewards}
            disabled={isClaimLoading || !balance || balance === 0n}
          >
            {isClaimLoading ? 'Claiming...' : 'Claim Rewards'}
          </Button>
        </div>
      </motion.div>
    </main>
  );
}