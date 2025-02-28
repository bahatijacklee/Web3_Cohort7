'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  deviceHash: string;
  dataType: string;
  dataHash: string;
  timestamp: bigint;
  value?: number; // Optional value extracted from dataHash
}

interface DataVisualizerProps {
  records: DataPoint[];
}

export function DataVisualizer({ records }: DataVisualizerProps) {
  // Process and sort records by timestamp
  const processedData = records
    .map(record => ({
      ...record,
      // Mock value for demonstration - in real app, decode this from dataHash
      value: Math.random() * 100,
      time: new Date(Number(record.timestamp) * 1000).toLocaleTimeString(),
    }))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  // Group data by device type
  const deviceGroups = processedData.reduce((groups: any, record) => {
    if (!groups[record.dataType]) {
      groups[record.dataType] = [];
    }
    groups[record.dataType].push(record);
    return groups;
  }, {});

  // Calculate statistics
  const stats = {
    totalRecords: records.length,
    uniqueDevices: new Set(records.map(r => r.deviceHash)).size,
    dataTypes: new Set(records.map(r => r.dataType)).size,
  };

  const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c'];

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">{stats.totalRecords}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unique Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-600">{stats.uniqueDevices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-pink-600">{stats.dataTypes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Data Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(deviceGroups).map((type, index) => (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey="value"
                    data={deviceGroups[type]}
                    name={type}
                    stroke={colors[index % colors.length]}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Data Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(deviceGroups).map(([type, records]: [string, any[]]) => ({
                  type,
                  count: records.length,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#2563eb" name="Number of Records" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
