'use client';

import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite, useWatchContractEvent } from 'wagmi';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import accessManagerAbi from '@/abis/AccessManager.json';
import oracleIntegrationAbi from '@/abis/OracleIntegration.json';
import { formatUnits, keccak256, stringToHex } from 'viem';

const ACCESS_MANAGER = "0x18C792C368279C490042E85fb4DCC2FB650CE44e";
const ORACLE_INTEGRATION = "0x18C792C368279C490042E85fb4DCC2FB650CE44e"; // Replace with actual address

export default function Admin() {
  const { isConnected, address } = useAccount();
  const { toast } = useToast();
  const [newAdmin, setNewAdmin] = useState('');
  const [oracleAddress, setOracleAddress] = useState('');
  const [dataFeedId, setDataFeedId] = useState('');

  // Check if current user is admin
  const { data: isAdmin } = useContractRead({
    address: ACCESS_MANAGER as `0x${string}`,
    abi: accessManagerAbi.abi,
    functionName: 'isAdmin',
    args: [address],
    enabled: isConnected && !!address,
  });

  // Add new admin
  const { writeAsync: addAdmin, isPending: addingAdmin } = useContractWrite({
    address: ACCESS_MANAGER as `0x${string}`,
    abi: accessManagerAbi.abi,
    functionName: 'addAdmin',
  });

  // Set oracle address
  const { writeAsync: setOracle, isPending: settingOracle } = useContractWrite({
    address: ORACLE_INTEGRATION as `0x${string}`,
    abi: oracleIntegrationAbi.abi,
    functionName: 'setOracleAddress',
  });

  // Set data feed ID
  const { writeAsync: setFeed, isPending: settingFeed } = useContractWrite({
    address: ORACLE_INTEGRATION as `0x${string}`,
    abi: oracleIntegrationAbi.abi,
    functionName: 'setDataFeedId',
  });

  // Watch for AdminAdded events
  useWatchContractEvent({
    address: ACCESS_MANAGER as `0x${string}`,
    abi: accessManagerAbi.abi,
    eventName: 'AdminAdded',
    onLogs(logs) {
      logs.forEach((log) => {
        const [newAdminAddress] = log.args as [string];
        toast({
          title: 'New Admin Added',
          description: `Address: ${newAdminAddress}`,
          variant: 'success',
        });
      });
    },
  });

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin) return;

    try {
      const tx = await addAdmin({
        args: [newAdmin],
      });
      
      toast({
        title: 'Adding new admin...',
        variant: 'default',
      });

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        toast({
          title: 'Successfully added new admin',
          variant: 'success',
        });
        setNewAdmin('');
      } else {
        toast({
          title: 'Failed to add admin',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error adding admin',
        description: 'Please check the address and try again',
        variant: 'destructive',
      });
      console.error('Error adding admin:', error);
    }
  };

  const handleSetOracle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oracleAddress) return;

    try {
      const tx = await setOracle({
        args: [oracleAddress],
      });
      
      toast({
        title: 'Setting oracle address...',
        variant: 'default',
      });

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        toast({
          title: 'Successfully set oracle address',
          variant: 'success',
        });
        setOracleAddress('');
      } else {
        toast({
          title: 'Failed to set oracle address',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error setting oracle address',
        description: 'Please check the address and try again',
        variant: 'destructive',
      });
      console.error('Error setting oracle:', error);
    }
  };

  const handleSetDataFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataFeedId) return;

    try {
      const tx = await setFeed({
        args: [stringToHex(dataFeedId)],
      });
      
      toast({
        title: 'Setting data feed ID...',
        variant: 'default',
      });

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        toast({
          title: 'Successfully set data feed ID',
          variant: 'success',
        });
        setDataFeedId('');
      } else {
        toast({
          title: 'Failed to set data feed ID',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error setting data feed ID',
        description: 'Please try again',
        variant: 'destructive',
      });
      console.error('Error setting data feed:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Please connect your wallet to access admin features</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">Access denied. Admin privileges required.</p>
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
          <Shield className="mr-2" /> Admin Dashboard
        </h1>

        {/* Add Admin Form */}
        <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <h2 className="text-2xl font-semibold mb-4">Add New Admin</h2>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <Label htmlFor="newAdmin">Admin Address</Label>
              <Input
                id="newAdmin"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <Button type="submit" disabled={addingAdmin}>
              {addingAdmin ? 'Adding...' : 'Add Admin'}
            </Button>
          </form>
        </div>

        {/* Oracle Settings */}
        <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <h2 className="text-2xl font-semibold mb-4">Oracle Settings</h2>
          <div className="space-y-6">
            <form onSubmit={handleSetOracle} className="space-y-4">
              <div>
                <Label htmlFor="oracleAddress">Oracle Address</Label>
                <Input
                  id="oracleAddress"
                  value={oracleAddress}
                  onChange={(e) => setOracleAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <Button type="submit" disabled={settingOracle}>
                {settingOracle ? 'Setting...' : 'Set Oracle Address'}
              </Button>
            </form>

            <form onSubmit={handleSetDataFeed} className="space-y-4">
              <div>
                <Label htmlFor="dataFeedId">Data Feed ID</Label>
                <Input
                  id="dataFeedId"
                  value={dataFeedId}
                  onChange={(e) => setDataFeedId(e.target.value)}
                  placeholder="Enter data feed ID"
                />
              </div>
              <Button type="submit" disabled={settingFeed}>
                {settingFeed ? 'Setting...' : 'Set Data Feed ID'}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </main>
  );
}