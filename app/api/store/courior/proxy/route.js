import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/firebase-admin'
import authSeller from '@/middlewares/authSeller'
import { ltlRequest } from '@/lib/delhiveryLtl'

const ACTIONS = {
    tat_estimate: { method: 'GET', path: '/tat/estimate' },
    pincode_service: { method: 'GET', path: '/pincode-service/{pin}' },
    freight_estimate: { method: 'POST', path: '/freight/estimate' },
    freight_breakup: { method: 'GET', path: '/lrn/freight-breakup' },
    manifest_create: { method: 'POST', path: '/manifest' },
    manifest_status: { method: 'GET', path: '/manifest' },
    lrn_update: { method: 'PUT', path: '/lrn/update/{lrn}' },
    lrn_cancel: { method: 'DELETE', path: '/lrn/cancel/{lrn}' },
    lrn_track: { method: 'GET', path: '/lrn/track' },
    appointments_lm: { method: 'POST', path: '/appointments/lm' },
    pickup_create: { method: 'POST', path: '/pickup_requests' },
    pickup_cancel: { method: 'DELETE', path: '/pickup_requests/{pickup_id}' },
    label_get: { method: 'GET', path: '/label/get_urls/{size}/{lrn}' },
    generate_document: { method: 'POST', path: '/generate' },
    generate_status: { method: 'GET', path: '/generate/shipping_label/status/{job_id}' },
    document_download: { method: 'GET', path: '/document/download' }
}

const resolvePath = (template, params) => {
    return template.replace(/\{(.*?)\}/g, (_, key) => {
        const value = params?.[key]
        if (!value) {
            throw new Error(`Missing required param: ${key}`)
        }
        return encodeURIComponent(String(value))
    })
}

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
        }

        const idToken = authHeader.split(' ')[1]
        let decodedToken
        try {
            decodedToken = await getAuth().verifyIdToken(idToken)
        } catch (error) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
        }

        const storeId = await authSeller(decodedToken.uid)
        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized - not a seller' }, { status: 403 })
        }

        const { action, params, data, headers } = await request.json()
        if (!action || !ACTIONS[action]) {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }

        const config = ACTIONS[action]
        const path = resolvePath(config.path, params)
        const responseData = await ltlRequest({
            method: config.method,
            path,
            params: config.method === 'GET' ? params : null,
            data: config.method !== 'GET' ? data : null,
            headers
        })

        return NextResponse.json({ success: true, data: responseData })
    } catch (error) {
        console.error('[store/courior proxy] Error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to call Delhivery LTL API'
        }, { status: 500 })
    }
}
