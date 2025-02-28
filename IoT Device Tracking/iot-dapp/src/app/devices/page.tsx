'use client';

import React, { useState } from 'react';
import { useAccount, useReadContract, useContractWrite } from 'wagmi';
import { motion } from 'framer-motion';
import { HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import deviceRegistryAbi from '../abis/DeviceRegistry.json';
import { keccak256, stringToHex } from 'viem'; // For generating deviceHash

const DEVICE_REGISTRY = "0x7F87c05515b919b6611B8610EC68A0DF0ab9Dd25";

export default function Devices() {
  const { isConnected, address } = useAccount();
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [deviceLocation, setDeviceLocation] = useState('');

  const { data: devices, isLoading: devicesLoading } = useReadContract({
    address: DEVICE_REGISTRY as `0x${string}`,
    abi: deviceRegistryAbi.abi,
    functionName: 'getDevicesByOwnerPaginated',
    args: [address, 0, 10],
    enabled: isConnected && !!address,
  });

  const { writeAsync: registerDevice, isLoading: registering } = useContractWrite({
    address: DEVICE_REGISTRY as `0x${string}`,
    abi: deviceRegistryAbi.abi,
    functionName: 'registerDevice',
  });

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName || !deviceType || !deviceLocation) return;

    try {
      const deviceHash = keccak256(stringToHex(deviceName)); // Generate hash from name
      await registerDevice({
        args: [deviceHash, deviceType, 'Manufacturer', 'Model', deviceLocation, '0x'], // Simplified signature
      });

      // Reset form
      setDeviceName('');
      setDeviceType('');
      setDeviceLocation('');
    } catch (error) {
      console.error('Error registering device:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-lg text-foreground">Please connect your wallet to manage devices</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8 bg-background transition-all smooth-transition">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-10 animate-fadeIn transition-all smooth-transition text-center"
      >
        <h1 className="text-4xl font-bold flex items-center justify-center text-foreground transition-all smooth-transition">
          <HardDrive className="mr-4 h-8 w-8 sm:h-10 sm:w-10 text-primary transition-all smooth-transition" /> Device Management
        </h1>

        {/* Registration Form */}
        <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all smooth-transition">
          <form onSubmit={handleRegisterDevice} className="space-y-6">
            <div>
              <Label htmlFor="deviceName" className="text-foreground">Device Name</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Enter device name"
                className="w-full bg-background text-foreground border-border transition-all smooth-transition"
              />
            </div>
            <div>
              <Label htmlFor="deviceType" className="text-foreground">Device Type</Label>
              <Input
                id="deviceType"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                placeholder="Enter device type"
                className="w-full bg-background text-foreground border-border transition-all smooth-transition"
              />
            </div>
            <div>
              <Label htmlFor="deviceLocation" className="text-foreground">Location</Label>
              <Input
                id="deviceLocation"
                value={deviceLocation}
                onChange={(e) => setDeviceLocation(e.target.value)}
                placeholder="Enter device location"
                className="w-full bg-background text-foreground border-border transition-all smooth-transition"
              />
            </div>
            <Button type="submit" className="btn-modern w-full transition-all smooth-transition" disabled={registering}>
              {registering ? 'Registering...' : 'Register Device'}
            </Button>
          </form>
        </div>

        {/* Devices Table */}
        <div className="max-w-4xl mx-auto mt-10">
          <h2 className="text-2xl font-semibold text-foreground mb-6 transition-all smooth-transition text-center">Your Devices</h2>
          {devicesLoading ? (
            <p className="text-muted-foreground text-center">Loading devices...</p>
          ) : devices && devices.length > 0 ? (
            <div className="bg-card border border-border rounded-xl shadow-lg transition-all smooth-transition">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="text-foreground text-center">Hash</TableHead>
                    <TableHead className="text-foreground text-center">Type</TableHead>
                    <TableHead className="text-foreground text-center">Location</TableHead>
                    <TableHead className="text-foreground text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device: any, index: number) => (
                    <TableRow key={index} className="hover:bg-muted/50 transition-all smooth-transition">
                      <TableCell className="text-foreground text-center">{device.deviceHash}</TableCell>
                      <TableCell className="text-foreground text-center">{device.deviceType}</TableCell>
                      <TableCell className="text-foreground text-center">{device.location}</TableCell>
                      <TableCell className="text-foreground text-center">{device.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No devices registered yet</p>
          )}
        </div>
      </motion.div>
    </main>
  );
}