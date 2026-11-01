import { adminRoute } from '../../../src/lib/admin-api.js'
import { getStripeConfig } from '../../../src/lib/stripe.js'
import { isEmailConfigured } from '../../../src/lib/email.js'

// /admin > Réglages: which services are connected (never the keys).
export default adminRoute(['GET'], async () => {
  const stripe = await getStripeConfig()
  return {
    stripe: !!stripe.secretKey,
    checkout: !!(stripe.secretKey && stripe.publishableKey),
    stripeLive: stripe.live,
    stripeWebhook: !!stripe.webhookSecret,
    email: isEmailConfigured(),
    notificationEmail: !!(process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL),
    database: process.env.DATABASE_URL ? 'postgres' : 'none',
  }
}, 'admin/status')
