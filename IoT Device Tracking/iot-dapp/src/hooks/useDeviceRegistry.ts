import { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { formatUnits } from 'viem';
import deviceRegistryAbi from '@/abis/DeviceRegistry.json';

const DEVICE_REGISTRY = "0x18C792C368279C490042E85fb4DCC2FB650CE44e"; // Replace with actual contract address

export interface Device {
  id: string;
  owner: string;
  name: string;
  dataType: string;
  isActive: boolean;
  reputation: number;
}

export function useDeviceRegistry() {
  const { address } = useAccount();
  const [userDevices, setUserDevices] = useState<Device[]>([]);
  const [publicDevices, setPublicDevices] = useState<Device[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Read user's devices
  const { data: userDevicesData } = useContractRead({
    address: DEVICE_REGISTRY as `0x${string}`,
    abi: deviceRegistryAbi.abi,
    functionName: 'getDevicesByOwner',
    args: [address],
    enabled: !!address,
  });

  // Read public devices
  const { data: publicDevicesData } = useContractRead({
    address: DEVICE_REGISTRY as `0x${string}`,
    abi: deviceRegistryAbi.abi,
    functionName: 'getPublicDevices',
  });

  // Check if user is admin
  const { data: isAdminData } = useContractRead({
    address: DEVICE_REGISTRY as `0x${string}`,
    abi: deviceRegistryAbi.abi,
    functionName: 'hasRole',
    args: ['0x0000000000000000000000000000000000000000000000000000000000000000', address], // DEFAULT_ADMIN_ROLE
    enabled: !!address,
  });

  useEffect(() => {
    if (userDevicesData) {
      setUserDevices(
        (userDevicesData as any[]).map((device: any) => ({
          id: device.id,
          owner: device.owner,
          name: device.name,
          dataType: device.dataType,
          isActive: device.isActive,
          reputation: Number(formatUnits(device.reputation, 0)),
        }))
      );
    }
  }, [userDevicesData]);

  useEffect(() => {
    if (publicDevicesData) {
      setPublicDevices(
        (publicDevicesData as any[]).map((device: any) => ({
          id: device.id,
          owner: device.owner,
          name: device.name,
          dataType: device.dataType,
          isActive: device.isActive,
          reputation: Number(formatUnits(device.reputation, 0)),
        }))
      );
    }
  }, [publicDevicesData]);

  useEffect(() => {
    if (isAdminData !== undefined) {
      setIsAdmin(isAdminData as boolean);
    }
  }, [isAdminData]);

  return {
    userDevices,
    publicDevices,
    isAdmin,
  };
}
