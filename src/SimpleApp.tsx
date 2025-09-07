import React from 'react'
import { RelationshipDashboard } from '@/components/RelationshipDashboard'
import { ToastProvider } from '@/components/ToastNotifications'
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary'

/**
 * Simple App Entry Point
 * 
 * Uses the new RelationshipDashboard instead of the complex 96-component system.
 * This provides the usable interface focused on relationships and daily workflow.
 */

function SimpleApp() {
  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <div className="w-full h-screen">
          <RelationshipDashboard />
        </div>
      </ToastProvider>
    </GlobalErrorBoundary>
  )
}

export default SimpleApp