import { adminRoute } from '../../../src/lib/admin-api.js'
import { deleteMessage, listMessages, setMessageRead, unreadMessages } from '../../../src/lib/admin-site.js'

// /admin > Clients > Messages.
//   GET            → messages   ·   GET ?count=unread → number
//   PATCH { id, read }   ·   DELETE { id }
export default adminRoute(['GET', 'PATCH', 'DELETE'], req => {
  if (req.method === 'GET') return req.query.count === 'unread' ? unreadMessages() : listMessages()
  if (req.method === 'PATCH') return setMessageRead(req.body?.id, req.body?.read)
  return deleteMessage(req.body?.id)
}, 'admin/messages')
