'use client';
import React from 'react';
// import axios from 'axios';
// import { MapPinIcon, GlobeIcon, Smartphone, Clock } from 'lucide-react';
// import { useAuth } from '@/lib/useAuth';
// import CustomerLocationMap from './CustomerLocationMap';
// import LocationCharts from './LocationCharts';

export default function CustomerLocationAnalytics() {
  // All analytics UI is disabled for now
  return null;
}

function SummaryCard({ icon: IconComponent, title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {IconComponent && <IconComponent className="w-5 h-5" />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-gray-600">{subtitle}</p>
    </div>
  );
}
