export function frenchPhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('33') && digits.length >= 11) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 9)
}

export function formatFrenchPhone(value) {
  const digits = frenchPhoneDigits(value)
  if (!digits) return ''
  const groups = [digits.slice(0, 1)]
  for (let index = 1; index < digits.length; index += 2) groups.push(digits.slice(index, index + 2))
  return groups.join(' ')
}

export function normalizeFrenchPhone(value) {
  const digits = frenchPhoneDigits(value)
  return /^[1-9]\d{8}$/.test(digits) ? `+33${digits}` : null
}
