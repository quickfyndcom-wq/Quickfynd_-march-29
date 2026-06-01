'use client';
import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function LocationCharts({ summary = {} }) {
  if (!summary || Object.keys(summary).length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
        <p>No location data available to display charts</p>
      </div>
    );
  }

  const { byCountry = [], byCity = [], byDevice = [], byBrowser = [] } = summary;

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="w-full space-y-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Visitors by Country</h3>
        <div className="w-full h-80 bg-gray-50 rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCountry.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="country"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Visitors by City</h3>
        <div className="w-full h-80 bg-gray-50 rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCity.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="city"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Visitors by Device</h3>
          <div className="w-full h-80 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byDevice}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {byDevice.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Visitors by Browser</h3>
          <div className="w-full h-80 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byBrowser}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {byBrowser.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Location Table Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Location Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Top Countries</h4>
            <div className="space-y-2">
              {byCountry.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span className="text-gray-700">{item.country}</span>
                  <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Top Cities</h4>
            <div className="space-y-2">
              {byCity.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span className="text-gray-700">{item.city}</span>
                  <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
