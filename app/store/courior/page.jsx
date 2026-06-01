'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import axios from 'axios'
import toast from 'react-hot-toast'

const defaultFreightPayload = `{
  "dimensions": [
    {
      "length_cm": 11,
      "width_cm": 1.1,
      "height_cm": 11,
      "box_count": 1
    }
  ],
  "weight_g": 100000,
  "cheque_payment": false,
  "source_pin": "400069",
  "consignee_pin": "400069",
  "payment_mode": "prepaid",
  "inv_amount": 123,
  "freight_mode": "fod",
  "rov_insurance": true
}`

const defaultPickupPayload = `{
  "client_warehouse": "test",
  "pickup_date": "2024-07-30",
  "start_time": "05:00:00",
  "expected_package_count": 1
}`

const defaultManifestPayload = `{
  "lrn": "",
  "pickup_location_name": "pass registered wh name",
  "payment_mode": "cod",
  "cod_amount": "122",
  "weight": "100",
  "dropoff_location": {
    "consignee_name": "Utkarsh",
    "address": "sector 7a",
    "city": "jajpur",
    "state": "odisha",
    "zip": "756043",
    "phone": "9876543210",
    "email": ""
  }
}`

export default function CourierConsolePage() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const [busyAction, setBusyAction] = useState('')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState('')

  const [lrnTrack, setLrnTrack] = useState('')
  const [freightPayload, setFreightPayload] = useState(defaultFreightPayload)
  const [freightLrns, setFreightLrns] = useState('')
  const [pickupPayload, setPickupPayload] = useState(defaultPickupPayload)
  const [pickupCancelId, setPickupCancelId] = useState('')
  const [tatOrigin, setTatOrigin] = useState('')
  const [tatDestination, setTatDestination] = useState('')
  const [tatMot, setTatMot] = useState('S')
  const [tatPdt, setTatPdt] = useState('B2B')
  const [pincode, setPincode] = useState('')
  const [pincodeWeight, setPincodeWeight] = useState('1')
  const [labelSize, setLabelSize] = useState('std')
  const [labelLrn, setLabelLrn] = useState('')
  const [manifestPayload, setManifestPayload] = useState(defaultManifestPayload)
  const [manifestJobId, setManifestJobId] = useState('')
  const [lrnUpdateLrn, setLrnUpdateLrn] = useState('')
  const [lrnUpdatePayload, setLrnUpdatePayload] = useState('{}')
  const [lrnCancelId, setLrnCancelId] = useState('')
  const [documentLrn, setDocumentLrn] = useState('')
  const [documentType, setDocumentType] = useState('LM_POD')
  const [documentVersion, setDocumentVersion] = useState('latest')
  const [generatePayload, setGeneratePayload] = useState('{}')
  const [generateStatusId, setGenerateStatusId] = useState('')

  useEffect(() => {
    const lrn = searchParams.get('lrn')
    if (lrn) {
      setLrnTrack(lrn)
      setLabelLrn(lrn)
      setDocumentLrn(lrn)
      setLrnCancelId(lrn)
      setLrnUpdateLrn(lrn)
    }
  }, [searchParams])

  const hasResponse = useMemo(() => response !== null, [response])

  const callProxy = async (action, params, data) => {
    setBusyAction(action)
    setError('')

    try {
      const token = await getToken(true)
      const { data: res } = await axios.post('/api/store/courior/proxy', {
        action,
        params,
        data
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      })

      setResponse(res.data)
      toast.success('Delhivery response received')
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Request failed'
      setError(message)
      setResponse(null)
      toast.error(message)
    } finally {
      setBusyAction('')
    }
  }

  const parseJson = (value) => {
    if (!value) return {}
    try {
      return JSON.parse(value)
    } catch (err) {
      setError('Invalid JSON payload')
      return null
    }
  }

  return (
    <div className="mb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Courier Console (Delhivery LTL)</h1>
        <p className="text-sm text-slate-500">Run Delhivery LTL actions directly from the dashboard.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">LRN Track</h2>
          <p className="text-xs text-slate-500 mb-3">Track an LRN/waybill.</p>
          <input
            value={lrnTrack}
            onChange={(e) => setLrnTrack(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Enter LRN"
          />
          <button
            onClick={() => callProxy('lrn_track', { lrnum: lrnTrack })}
            disabled={!lrnTrack || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'lrn_track' ? 'Loading...' : 'Track'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">TAT Estimate</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input 
              value={tatOrigin} 
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setTatOrigin(value);
              }} 
              maxLength={6}
              pattern="[0-9]{6}"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm" 
              placeholder="Origin pincode (6 digits)" 
            />
            <input 
              value={tatDestination} 
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setTatDestination(value);
              }} 
              maxLength={6}
              pattern="[0-9]{6}"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm" 
              placeholder="Destination pincode (6 digits)" 
            />
            <input value={tatMot} onChange={(e) => setTatMot(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="MOT" />
            <input value={tatPdt} onChange={(e) => setTatPdt(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="PDT" />
          </div>
          <button
            onClick={() => callProxy('tat_estimate', { origin_pin: tatOrigin, destination_pin: tatDestination, mot: tatMot, pdt: tatPdt })}
            disabled={!tatOrigin || !tatDestination || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'tat_estimate' ? 'Loading...' : 'Estimate TAT'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Pincode Serviceability</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input 
              value={pincode} 
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPincode(value);
              }} 
              maxLength={6}
              pattern="[0-9]{6}"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm" 
              placeholder="Pincode (6 digits)" 
            />
            <input value={pincodeWeight} onChange={(e) => setPincodeWeight(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Weight" />
          </div>
          <button
            onClick={() => callProxy('pincode_service', { pin: pincode, weight: pincodeWeight })}
            disabled={!pincode || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'pincode_service' ? 'Loading...' : 'Check Pincode'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Freight Estimate</h2>
          <textarea
            value={freightPayload}
            onChange={(e) => setFreightPayload(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              const payload = parseJson(freightPayload)
              if (payload === null) return
              callProxy('freight_estimate', null, payload)
            }}
            disabled={busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'freight_estimate' ? 'Loading...' : 'Estimate Freight'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Freight Breakup</h2>
          <input
            value={freightLrns}
            onChange={(e) => setFreightLrns(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Comma separated LRNs"
          />
          <button
            onClick={() => callProxy('freight_breakup', { lrns: freightLrns })}
            disabled={!freightLrns || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'freight_breakup' ? 'Loading...' : 'Fetch Breakup'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Pickup Request</h2>
          <textarea
            value={pickupPayload}
            onChange={(e) => setPickupPayload(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              const payload = parseJson(pickupPayload)
              if (payload === null) return
              callProxy('pickup_create', null, payload)
            }}
            disabled={busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'pickup_create' ? 'Loading...' : 'Create Pickup'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Pickup Cancel</h2>
          <input
            value={pickupCancelId}
            onChange={(e) => setPickupCancelId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Pickup ID"
          />
          <button
            onClick={() => callProxy('pickup_cancel', { pickup_id: pickupCancelId })}
            disabled={!pickupCancelId || busyAction}
            className="mt-3 w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busyAction === 'pickup_cancel' ? 'Loading...' : 'Cancel Pickup'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Manifest Create</h2>
          <p className="text-xs text-slate-500">Some manifest fields require multipart uploads.</p>
          <textarea
            value={manifestPayload}
            onChange={(e) => setManifestPayload(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              const payload = parseJson(manifestPayload)
              if (payload === null) return
              callProxy('manifest_create', null, payload)
            }}
            disabled={busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'manifest_create' ? 'Loading...' : 'Create Manifest'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Manifest Status</h2>
          <input
            value={manifestJobId}
            onChange={(e) => setManifestJobId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Job ID"
          />
          <button
            onClick={() => callProxy('manifest_status', { job_id: manifestJobId })}
            disabled={!manifestJobId || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'manifest_status' ? 'Loading...' : 'Check Status'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">LRN Update</h2>
          <input
            value={lrnUpdateLrn}
            onChange={(e) => setLrnUpdateLrn(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-3"
            placeholder="LRN"
          />
          <textarea
            value={lrnUpdatePayload}
            onChange={(e) => setLrnUpdatePayload(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              const payload = parseJson(lrnUpdatePayload)
              if (payload === null) return
              callProxy('lrn_update', { lrn: lrnUpdateLrn }, payload)
            }}
            disabled={!lrnUpdateLrn || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'lrn_update' ? 'Loading...' : 'Update LRN'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">LRN Cancel</h2>
          <input
            value={lrnCancelId}
            onChange={(e) => setLrnCancelId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="LRN"
          />
          <button
            onClick={() => callProxy('lrn_cancel', { lrn: lrnCancelId })}
            disabled={!lrnCancelId || busyAction}
            className="mt-3 w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busyAction === 'lrn_cancel' ? 'Loading...' : 'Cancel LRN'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Label URL</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={labelSize} onChange={(e) => setLabelSize(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Size" />
            <input value={labelLrn} onChange={(e) => setLabelLrn(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="LRN" />
          </div>
          <button
            onClick={() => callProxy('label_get', { size: labelSize, lrn: labelLrn })}
            disabled={!labelLrn || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'label_get' ? 'Loading...' : 'Get Label URL'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Document Download</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input value={documentLrn} onChange={(e) => setDocumentLrn(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="LRN" />
            <input value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Doc type" />
          </div>
          <input value={documentVersion} onChange={(e) => setDocumentVersion(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Version" />
          <button
            onClick={() => callProxy('document_download', { lrn: documentLrn, doc_type: documentType, version: documentVersion })}
            disabled={!documentLrn || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'document_download' ? 'Loading...' : 'Download Document'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Generate Document</h2>
          <textarea
            value={generatePayload}
            onChange={(e) => setGeneratePayload(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              const payload = parseJson(generatePayload)
              if (payload === null) return
              callProxy('generate_document', null, payload)
            }}
            disabled={busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'generate_document' ? 'Loading...' : 'Generate Document'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Generate Status</h2>
          <input
            value={generateStatusId}
            onChange={(e) => setGenerateStatusId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Job ID"
          />
          <button
            onClick={() => callProxy('generate_status', { job_id: generateStatusId })}
            disabled={!generateStatusId || busyAction}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busyAction === 'generate_status' ? 'Loading...' : 'Check Generate Status'}
          </button>
        </section>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Response</h2>
        <pre className="whitespace-pre-wrap text-xs text-slate-700">
          {hasResponse ? JSON.stringify(response, null, 2) : 'No response yet.'}
        </pre>
      </div>
    </div>
  )
}
