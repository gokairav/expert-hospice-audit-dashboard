import { useState } from 'react'

// Drop the real logo file at public/logo.png (or src/assets/logo.png and
// update the src below) -- until then this renders a monogram placeholder
// so the layout never breaks.
export default function Logo({ size = 36 }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="rounded-lg bg-teal-500 text-navy-950 font-bold flex items-center justify-center shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        EH
      </div>
    )
  }

  return (
    <img
      src="/expert%20logo%20trans.png"
      alt="Expert Hospice"
      style={{ width: size, height: size }}
      className="object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  )
}
