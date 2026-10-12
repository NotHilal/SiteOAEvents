export const CUSTOMER_AUTH_EVENT = 'oa-customer-auth-changed'

export function notifyCustomerAuthChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CUSTOMER_AUTH_EVENT))
}

export async function fetchCustomerSession() {
  try {
    const response = await fetch('/api/account/session', { credentials: 'same-origin' })
    if (!response.ok) return null
    const data = await response.json()
    return data.user || null
  } catch {
    return null
  }
}

export async function logoutCustomer() {
  try {
    await fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    notifyCustomerAuthChanged()
  }
}
