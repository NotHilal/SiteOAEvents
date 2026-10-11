import { useEffect, useRef } from 'react'
import intlTelInput from 'intl-tel-input'
import fr from 'intl-tel-input/locale/fr'
import 'intl-tel-input/styles'

// One phone field with an international dial-code picker (flag + code on
// the left, number on the right) — the same library options.fr uses
// (intl-tel-input). France by default. Reports { number, valid, empty } to
// the parent: `number` is E.164 (+33612345678) once the validation utils
// have loaded, otherwise whatever was typed. The library owns the input's
// value, so remount with a new `key` to clear it.
export default function PhoneInput({ id, name, onChange, invalid, describedBy }) {
  const inputRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const input = inputRef.current
    const iti = intlTelInput(input, {
      initialCountry: 'fr',
      countryOrder: ['fr', 'be', 'ch', 'lu', 'mc'],
      countryNameLocale: 'fr',
      uiTranslations: fr,
      separateDialCode: true,
      loadUtils: () => import('intl-tel-input/utils'),
    })

    const report = () => {
      const raw = input.value.trim()
      onChangeRef.current?.({
        number: raw ? (iti.getNumber() || raw) : '',
        // null = utils still loading: don't block the form on that.
        valid: !raw || iti.isValidNumber() !== false,
        empty: !raw,
      })
    }
    // The country list scrolls on its own; keep Lenis' smooth scroll off it.
    const preventLenis = () => {
      document.querySelectorAll('.iti__country-list').forEach(el => el.setAttribute('data-lenis-prevent', ''))
    }
    input.addEventListener('input', report)
    input.addEventListener('countrychange', report)
    input.addEventListener('open:countryselector', preventLenis)
    iti.promise?.then(report).catch(() => {})
    return () => {
      input.removeEventListener('input', report)
      input.removeEventListener('countrychange', report)
      input.removeEventListener('open:countryselector', preventLenis)
      iti.destroy()
    }
  }, [])

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="tel"
      autoComplete="tel"
      className="form-control"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    />
  )
}
