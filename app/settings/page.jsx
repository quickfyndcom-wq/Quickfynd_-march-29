import { Suspense } from 'react'
import Loading from '@/components/Loading'
import SettingsClient from './SettingsClient'

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsClient />
    </Suspense>
  )
}
