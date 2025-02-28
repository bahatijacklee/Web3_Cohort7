'use client';

import React, { useState } from 'react';
import { useAccount, useReadContract, useContractWrite } from 'wagmi';
import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zeroAddress } from 'viem';
import { DataVisualizer } from '@/components/DataVisualizer';
import iotDataLedgerAbi from '@/abis/IoTDataLedger.json';

const IOT_DATA_LEDGER = "0xf6A7E3d41611FcAf815C6943807B690Ee9Bf8220";

export default function Data() {
  const { isConnected, address } = useAccount();
  const [deviceHash, setDeviceHash] = useState('');
  const [dataType, setDataType] = useState('');
  const [dataHash, setDataHash] = useState('');
  const [showVisualizer, setShowVisualizer] = useState(true);

  // Fetch data records (first 10 for simplicity)
  const { data: records, isLoading: recordsLoading } = useReadContract({
    address: IOT_DATA_LEDGER as `0x${string}`,
    abi: iotDataLedgerAbi.abi,
    functionName: 'getRecords',
    args: [deviceHash || zeroAddress, 0n, 10n], // Use BigInt for pagination
    enabled: isConnected,
  });

  // Write to record data
  const { writeAsync: recordData, isLoading: recording } = useContractWrite({
    address: IOT_DATA_LEDGER as `0x${string}`,
    abi: iotDataLedgerAbi.abi,
    functionName: 'recordData',
  });

  const handleRecordData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceHash || !dataType || !dataHash) return;

    try {
      await recordData({
        args: [deviceHash, dataType, dataHash],
      });
      setDeviceHash('');
      setDataType('');
      setDataHash('');
    } catch (error) {
      console.error('Error recording data:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-lg text-foreground">Please connect your wallet to view and record data</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8 bg-background transition-all smooth-transition">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 animate-fadeIn transition-all smooth-transition text-center"
      >
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold flex items-center text-foreground transition-all smooth-transition">
            <Database className="mr-4 h-8 w-8 sm:h-10 sm:w-10 text-primary transition-all smooth-transition" /> IoT Data Records
          </h1>
          <Button
            variant="outline"
            onClick={() => setShowVisualizer(!showVisualizer)}
            className="mt-4 transition-all smooth-transition"
          >
            {showVisualizer ? 'Hide Charts' : 'Show Charts'}
          </Button>
        </div>

        {/* Data Recording Form */}
        <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all smooth-transition">
          <form onSubmit={handleRecordData} className="space-y-6">
            <div>
              <Label htmlFor="deviceHash" className="text-foreground">Device Hash</Label>
              <Input
                id="deviceHash"
                value={deviceHash}
                onChange={(e) => setDeviceHash(e.target.value)}
                placeholder="Enter device hash"
                className="w-full bg-background text-foreground border-border transition-all smooth-transition"
              />
            </div>
            <div>
              <Label htmlFor="dataType" className="text-foreground">Data Type</Label>
              <Input
                id="dataType"
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                placeholder="Enter data type (e.g., temperature)"
                className="w-full bg-background text-foreground border-border transition-all smooth-transition"
              />
            </div>
            <div>
              <Label htmlFor="dataHash" className="text-foreground">Data Hash</Label>
              <Input
                id="dataHash"
                value={dataHash}
                onChange={(e) => setDataHash(e.target.value)}
                placeholder="Enter data hash"
                className="w-full bg-background text-foreground border-border transition-all smooth-transition"
              />
            </div>
            <Button type="submit" className="btn-modern w-full transition-all smooth-transition" disabled={recording}>
              {recording ? 'Recording...' : 'Record Data'}
            </Button>
          </form>
        </div>

        {/* Data Visualization */}
        {showVisualizer && !recordsLoading && records && records.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto transition-all smooth-transition"
          >
            <DataVisualizer records={records} />
          </motion.div>
        )}

        {/* Data Records Table */}
        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 text-center transition-all smooth-transition">Recent Records</h2>
          {recordsLoading ? (
            <p className="text-muted-foreground text-center">Loading records...</p>
          ) : records && records.length > 0 ? (
            <div className="bg-card border border-border rounded-xl shadow-lg transition-all smooth-transition">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="text-foreground text-center">Device Hash</TableHead>
                    <TableHead className="text-foreground text-center">Data Type</TableHead>
                    <TableHead className="text-foreground text-center">Data Hash</TableHead>
                    <TableHead className="text-foreground text-center">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any, index: number) => (
                    <TableRow key={index} className="hover:bg-muted/50 transition-all smooth-transition">
                      <TableCell className="text-foreground text-center">{record.deviceHash}</TableCell>
                      <TableCell className="text-foreground text-center">{record.dataType}</TableCell>
                      <TableCell className="text-foreground text-center">{record.dataHash}</TableCell>
                      <TableCell className="text-foreground text-center">
                        {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No records found</p>
          )}
        </div>
      </motion.div>
    </main>
  );
}