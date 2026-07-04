import { forwardRef, useImperativeHandle, useRef } from 'react'

const CoordsReadout = forwardRef(function CoordsReadout({ className }, ref) {
  const xRef = useRef(null)
  const yRef = useRef(null)

  useImperativeHandle(ref, () => ({
    set(lat, lng) {
      if (xRef.current) xRef.current.textContent = lng.toFixed(6)
      if (yRef.current) yRef.current.textContent = lat.toFixed(6)
    },
  }))

  return (
    <div className={`${className} theme-fade pointer-events-none select-none text-[17px] leading-7`} style={{ color: 'var(--text-3)' }}>
      <div>
        X: <span ref={xRef}>29.989126</span>
      </div>
      <div>
        Y: <span ref={yRef}>5.399843</span>
      </div>
    </div>
  )
})

export default CoordsReadout
