import { useState } from 'react'

// Drop the robot mascot at public/mascot.png -- until then this renders a
// placeholder so the sidebar never breaks.
export default function Mascot({ size = 64 }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="rounded-full border-2 border-dashed border-white/25 flex items-center justify-center mx-auto"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        🤖
      </div>
    )
  }

  return (
    <img
      src="/mascot.png"
      alt="ATTAbot mascot"
      style={{ width: size, height: size }}
      className="object-contain mx-auto"
      onError={() => setFailed(true)}
    />
  )
}
