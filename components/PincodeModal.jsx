"use client";

import { useState } from "react";

export default function PincodeModal({ open, onClose, onPincodeSubmit }) {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!pincode || pincode.length !== 6) {
      setError("Please enter a valid 6-digit pincode");
      return;
    }

    setLoading(true);
    try {
      // Fetch pincode details from Indian Postal API
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];
        onPincodeSubmit({
          pincode: pincode,
          city: postOffice.Name || postOffice.Region || postOffice.Division,
          district: postOffice.District,
          state: postOffice.State,
          country: "India"
        });
        onClose();
      } else {
        // Accept pincode even when API does not resolve location; user can fill location manually.
        onPincodeSubmit({
          pincode,
          city: "",
          district: "",
          state: "",
          country: "India"
        });
        onClose();
      }
    } catch (err) {
      // Do not block user when lookup API fails.
      onPincodeSubmit({
        pincode,
        city: "",
        district: "",
        state: "",
        country: "India"
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Enter Your Pincode</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          We'll auto-fill your address details based on your pincode
        </p>


        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              placeholder="Enter 6-digit pincode"
              value={pincode}
              onChange={async (e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPincode(value);
                setError("");
                if (value.length === 6) {
                  setLoading(true);
                  try {
                    const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
                    const data = await response.json();
                    if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
                      const po = data[0].PostOffice[0];
                      const city = po.Name || po.Region || po.Division || "";
                      const state = po.State || "";
                      setError(`Location found: ${city}${state ? `, ${state}` : ""}`);
                    } else {
                      setError("Pincode accepted. Location details can be entered manually.");
                    }
                  } catch (err) {
                    setError("Pincode accepted. Location details can be entered manually.");
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              maxLength={6}
              autoFocus
              required
            />
            {error && (
              <div className={`text-sm mt-2 ${error.includes('Location found') ? 'text-green-600' : 'text-amber-600'}`}>{error}</div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
              disabled={loading}
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                loading ||
                !pincode ||
                pincode.length !== 6
              }
            >
              {loading ? "Fetching..." : "Continue"}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500">
          You can enter your address manually by clicking "Skip"
        </div>
      </div>
    </div>
  );
}
