import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ContactMessagesSeller() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data } = await axios.get('/api/store/contact-messages');
      setMessages(data.messages || []);
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="contact-messages" className="bg-white rounded-lg shadow p-4 sm:p-6 mt-8 overflow-hidden">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Contact Us Messages</h2>
      {loading ? (
        <div>Loading...</div>
      ) : messages.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No contact messages have been received yet.</div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Message</th>
                <th className="p-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">{msg.name}</td>
                  <td className="p-2">{msg.email}</td>
                  <td className="p-2">{msg.message}</td>
                  <td className="p-2">{new Date(msg.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
