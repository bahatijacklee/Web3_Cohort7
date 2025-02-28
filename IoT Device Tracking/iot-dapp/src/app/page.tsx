'use client';

import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Database, Shield } from 'lucide-react';
import { useDeviceRegistry } from '@/hooks/useDeviceRegistry';
import Particles from 'react-tsparticles'; // For animated particles

export default function Home() {
  const { isConnected } = useAccount();
  const { userDevices, publicDevices, isAdmin } = useDeviceRegistry();

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 transition-all smooth-transition relative">
      {/* Animated Particle Background */}
      <Particles
        className="absolute inset-0 z-0 opacity-10"
        options={{
          particles: {
            number: { value: 50, density: { enable: true, value_area: 800 } },
            color: { value: ['#4a90e2', '#a855f7'] },
            shape: { type: 'circle' },
            opacity: { value: 0.5 },
            size: { value: 3, random: true },
            move: { enable: true, speed: 1 },
            line_linked: { enable: true, distance: 150, color: '#4a90e2' },
          },
          interactivity: { detectsOn: 'canvas', events: { onHover: { enable: true, mode: 'repulse' } } },
          detectRetina: true,
        }}
      />

      <div className="container mx-auto space-y-16 text-center max-w-4xl relative z-10 transition-all smooth-transition min-h-[300px]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="animate-fadeIn space-y-10 transition-all smooth-transition"
        >
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent transition-all smooth-transition gradient-text leading-relaxed mb-8">
            IoT Device Tracking
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto transition-all smooth-transition mt-12">
            Secure and transparent IoT device management powered by blockchain technology
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all smooth-transition">
          <Card className="border border-border bg-card text-card-foreground hover:shadow-lg hover:shadow-primary/30 transition-all smooth-transition rounded-xl">
            <CardHeader className="space-y-0 pb-2 text-center transition-all smooth-transition">
              <CardTitle className="text-lg font-medium flex items-center justify-center gap-2 text-primary transition-all smooth-transition">
                <HardDrive className="h-6 w-6 sm:h-8 sm:w-8" />
                Total Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary transition-all smooth-transition">
                {isConnected ? (userDevices?.length || 0) : (publicDevices?.length || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card text-card-foreground hover:shadow-lg hover:shadow-purple-500/30 transition-all smooth-transition rounded-xl">
            <CardHeader className="space-y-0 pb-2 text-center transition-all smooth-transition">
              <CardTitle className="text-lg font-medium flex items-center justify-center gap-2 text-purple-500 transition-all smooth-transition">
                <Database className="h-6 w-6 sm:h-8 sm:w-8" />
                Data Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500 transition-all smooth-transition">
                Coming Soon
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card text-card-foreground hover:shadow-lg hover:shadow-secondary/30 transition-all smooth-transition rounded-xl">
            <CardHeader className="space-y-0 pb-2 text-center transition-all smooth-transition">
              <CardTitle className="text-lg font-medium flex items-center justify-center gap-2 text-foreground transition-all smooth-transition">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
                Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground transition-all smooth-transition">
                {isConnected ? (isAdmin ? 'Admin' : 'User') : 'Guest'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connect Wallet CTA */}
        {!isConnected && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="animate-fadeIn bg-muted border border-border rounded-xl p-6 sm:p-8 text-center max-w-2xl mx-auto shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all smooth-transition"
          >
            <h2 className="text-2xl font-bold mb-4 text-foreground transition-all smooth-transition">
              Connect Your Wallet
            </h2>
            <p className="text-muted-foreground mb-4 transition-all smooth-transition mt-6">
              Connect your wallet to start managing IoT devices, view real-time data, and earn rewards.
            </p>
            <p className="text-sm text-muted-foreground transition-all smooth-transition">
              Click the wallet icon in the top right corner to get started
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}