"use client";
import React, { useState } from 'react';

export default function OrdersDeliveryCharges({ orders = [], products = [] }) {
  const [rows, setRows] = useState(
    orders.length > 0
      ? orders.map(order => ({
          orderId: order._id,
          productName: order.orderItems?.[0]?.name || '',
          productPrice: order.orderItems?.[0]?.price || '',
          customerDelivery: '',
          ourDelivery: '',
          codCharge: '',
          expense: '',
          notes: '',
        }))
      : []
  );

  const handleChange = (idx, field, value) => {
    const updated = [...rows];
    updated[idx][field] = value;
    setRows(updated);
  };

  // Optionally allow manual row addition for custom entries
  const addRow = () => {
    setRows([
      ...rows,
      { orderId: '', productName: '', productPrice: '', customerDelivery: '', ourDelivery: '', codCharge: '', expense: '', notes: '' },
    ]);
  };

  const calcProfit = (row) => {
    const price = parseFloat(row.productPrice) || 0;
    const custDel = parseFloat(row.customerDelivery) || 0;
    const ourDel = parseFloat(row.ourDelivery) || 0;
    const cod = parseFloat(row.codCharge) || 0;
    const expense = parseFloat(row.expense) || 0;
    return price + custDel - ourDel - cod - expense;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Orders Delivery Charges</h1>
      <div className="mb-4 text-xs text-gray-500">
        Orders loaded: {orders.length}
        {orders.length > 0 && (
          <pre className="bg-gray-100 p-2 mt-2 rounded max-w-xl overflow-x-auto">{JSON.stringify(orders[0], null, 2)}</pre>
        )}
        {orders.length === 0 && <div className="text-red-500">No orders found for this seller/store.</div>}
      </div>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Order ID</th>
            <th className="border px-2 py-1">Product</th>
            <th className="border px-2 py-1">Product Price</th>
            <th className="border px-2 py-1">Customer Delivery</th>
            <th className="border px-2 py-1">Our Delivery</th>
            <th className="border px-2 py-1">COD Charge</th>
            <th className="border px-2 py-1">Other Expense</th>
            <th className="border px-2 py-1">Profit/Loss</th>
            <th className="border px-2 py-1">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1 bg-gray-50 font-mono text-xs">{row.orderId}</td>
              <td className="border px-2 py-1">{row.productName}</td>
              <td className="border px-2 py-1 bg-gray-50">{row.productPrice}</td>
              <td className="border px-2 py-1">
                <input value={row.customerDelivery} onChange={e => handleChange(idx, 'customerDelivery', e.target.value)} className="w-20 border rounded px-1" type="number" />
              </td>
              <td className="border px-2 py-1">
                <input value={row.ourDelivery} onChange={e => handleChange(idx, 'ourDelivery', e.target.value)} className="w-20 border rounded px-1" type="number" />
              </td>
              <td className="border px-2 py-1">
                <input value={row.codCharge} onChange={e => handleChange(idx, 'codCharge', e.target.value)} className="w-20 border rounded px-1" type="number" />
              </td>
              <td className="border px-2 py-1">
                <input value={row.expense} onChange={e => handleChange(idx, 'expense', e.target.value)} className="w-20 border rounded px-1" type="number" />
              </td>
              <td className="border px-2 py-1 font-semibold">{calcProfit(row)}</td>
              <td className="border px-2 py-1">
                <input value={row.notes} onChange={e => handleChange(idx, 'notes', e.target.value)} className="w-32 border rounded px-1" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Row</button>
    </div>
  );
}
