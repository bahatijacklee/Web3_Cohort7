'use client';

import { useState } from 'react';
import { House, HardDrive, Database, Gift, Shield, Bell, Sun, Moon } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { useWatchContractEvent } from 'wagmi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import accessManagerAbi from '@/abis/AccessManager.json';
import iotDataLedgerAbi from '@/abis/IoTDataLedger.json';
import tokenRewardsAbi from '@/abis/TokenRewards.json';
import oracleIntegrationAbi from '@/abis/OracleIntegration.json';
import { formatUnits } from 'viem';

const ACCESS_MANAGER = "0x18C792C368279C490042E85fb4DCC2FB650CE44e";
const IOT_DATA_LEDGER = "0xf6A7E3d41611FcAf815C6943807B690Ee9Bf8220";
const TOKEN_REWARDS = "0xca276186Eb9f3a58FCdfc4adA247Cbe8d935778a";
const ORACLE_INTEGRATION = "0xdEE3BCB5D4d97d4BD857D984cEd59c9C48Ab5c49";

export default function Navbar() {
  const { isConnected } = useAccount();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const isAdmin = false; // Replace with actual isAdmin logic

  // Watch for events across contracts
  useWatchContractEvent({
    address: ACCESS_MANAGER as `0x${string}`,
    abi: accessManagerAbi.abi,
    eventName: 'RoleGranted',
    onLogs: (logs) => {
      const message = `New admin role granted! ${logs[0].args.account}`;
      setNotifications(prev => [...prev, message]);
      toast.success(message);
    },
  });

  useWatchContractEvent({
    address: IOT_DATA_LEDGER as `0x${string}`,
    abi: iotDataLedgerAbi.abi,
    eventName: 'DataRecorded',
    onLogs: (logs) => {
      const message = `New data recorded for device ${logs[0].args.deviceId}`;
      setNotifications(prev => [...prev, message]);
      toast.info(message);
    },
  });

  useWatchContractEvent({
    address: TOKEN_REWARDS as `0x${string}`,
    abi: tokenRewardsAbi.abi,
    eventName: 'RewardClaimed',
    onLogs: (logs) => {
      const amount = formatUnits(logs[0].args.amount, 18);
      const message = `Reward claimed: ${amount} tokens`;
      setNotifications(prev => [...prev, message]);
      toast.success(message);
    },
  });

  useWatchContractEvent({
    address: ORACLE_INTEGRATION as `0x${string}`,
    abi: oracleIntegrationAbi.abi,
    eventName: 'DataFeedUpdated',
    onLogs: (logs) => {
      const message = `Oracle data feed updated for ID: ${logs[0].args.feedId}`;
      setNotifications(prev => [...prev, message]);
      toast.info(message);
    },
  });

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <HardDrive className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">TraceNet</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <House className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link href="/devices" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <HardDrive className="h-4 w-4" />
              <span>Devices</span>
            </Link>
            <Link href="/data" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Database className="h-4 w-4" />
              <span>Data</span>
            </Link>
            <Link href="/rewards" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Gift className="h-4 w-4" />
              <span>Rewards</span>
            </Link>
            {isConnected && isAdmin && (
              <Link href="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
            
            {showNotifications && notifications.length > 0 && (
              <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border p-4">
                <h3 className="font-semibold mb-2 text-foreground">Notifications</h3>
                <div className="space-y-2">
                  {notifications.map((notification, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {notification}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Wallet Connection */}
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}