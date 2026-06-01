'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCheck, Mail, Calendar, MapPin, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';

export default function RegisteredCustomersPage() {
  const { getToken } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [showAll, setShowAll] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });

  useEffect(() => {
    fetchRegisteredCustomers();
    const intervalId = setInterval(() => {
      fetchRegisteredCustomers();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [filter]);

  const fetchRegisteredCustomers = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.get(
        `/api/store/registered-customers?filter=${filter}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCustomers(response.data.customers || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Error fetching registered customers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="w-full space-y-6 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registered Customers</h2>
          <p className="text-gray-600 text-sm mt-1">Track customers who created accounts</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={UserCheck}
          title="Total Customers"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={Calendar}
          title="Today"
          value={stats.today}
          color="green"
        />
        <StatCard
          icon={Calendar}
          title="This Week"
          value={stats.thisWeek}
          color="purple"
        />
        <StatCard
          icon={Calendar}
          title="This Month"
          value={stats.thisMonth}
          color="orange"
        />
      </div>

      {/* Customers Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Customer Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">First Visit Location</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Last Location</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Total Visits</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, showAll ? customers.length : 10).map((customer, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 font-medium">{customer.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {customer.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {customer.firstVisitLocation ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{customer.firstVisitLocation.city}, {customer.firstVisitLocation.country}</span>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {customer.lastLocation ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{customer.lastLocation.city}, {customer.lastLocation.country}</span>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {customer.totalVisits || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No registered customers found for this period
          </div>
        )}
        {customers.length > 10 && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAll ? 'Show Less' : `Show More (${customers.length - 10} more)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: IconComponent, title, value, color }) {
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
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
