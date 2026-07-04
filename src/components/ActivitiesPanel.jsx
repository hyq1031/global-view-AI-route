import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ACTIVITIES, RISKS } from '../data/routes'

const STATUS_STYLES = {
  'In Transit': { color: '#2f6bff', bg: 'rgba(47, 107, 255, 0.12)' },
  Delivered: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  Delayed: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.14)' },
  'Customs Hold': { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)' },
}

const SEVERITY_COLORS = { High: '#dc2626', Medium: '#d97706', Low: '#16a34a' }

function ChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-[12px] font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      {status}
    </span>
  )
}

function ActivitiesTable() {
  return (
    <div className="min-w-0">
      <h3 className="theme-fade mb-4 text-[17px] font-bold" style={{ color: 'var(--text-1)' }}>
        Recent Activities
      </h3>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[110px_1fr_120px_70px_130px] gap-x-4 text-[13px]">
          {['Shipment', 'Route', 'Status', 'ETA', 'Progress'].map((h) => (
            <div key={h} className="theme-fade pb-2 font-semibold uppercase tracking-wide text-[11px]" style={{ color: 'var(--text-3)' }}>
              {h}
            </div>
          ))}
          {ACTIVITIES.map((a) => (
            <div key={a.id} className="theme-fade contents">
              <div className="theme-fade border-t py-3 font-semibold" style={{ color: 'var(--text-1)', borderColor: 'var(--row-line)' }}>
                #{a.id}
              </div>
              <div className="theme-fade truncate border-t py-3" style={{ color: 'var(--text-2)', borderColor: 'var(--row-line)' }}>
                {a.route}
              </div>
              <div className="border-t py-2.5" style={{ borderColor: 'var(--row-line)' }}>
                <StatusChip status={a.status} />
              </div>
              <div className="theme-fade border-t py-3" style={{ color: 'var(--text-2)', borderColor: 'var(--row-line)' }}>
                {a.eta}
              </div>
              <div className="flex items-center gap-2 border-t py-3" style={{ borderColor: 'var(--row-line)' }}>
                <div className="theme-fade h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--chip-bg)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${a.progress}%`, background: STATUS_STYLES[a.status].color }}
                  />
                </div>
                <span className="theme-fade w-8 text-right text-[12px] font-medium" style={{ color: 'var(--text-3)' }}>
                  {a.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RiskCard() {
  return (
    <div className="theme-fade rounded-2xl border p-5" style={{ borderColor: 'var(--glass-border)', background: 'var(--chip-bg)' }}>
      <div className="flex items-baseline justify-between">
        <h3 className="theme-fade text-[17px] font-bold" style={{ color: 'var(--text-1)' }}>
          Risk Overview
        </h3>
        <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ background: 'var(--yellow)', color: '#16203c' }}>
          {RISKS.length} alerts
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="theme-fade text-[42px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>
          72
        </span>
        <span className="theme-fade text-[14px] font-medium" style={{ color: 'var(--text-2)' }}>
          / 100 · Moderate exposure
        </span>
      </div>
      <div className="theme-fade mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--chip-bg)' }}>
        <div className="h-full rounded-full" style={{ width: '72%', background: 'linear-gradient(90deg, #16a34a, #f6c51c, #d97706)' }} />
      </div>
      <ul className="mt-5 space-y-3">
        {RISKS.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5 text-[13.5px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEVERITY_COLORS[r.severity] }} />
            <span className="theme-fade flex-1" style={{ color: 'var(--text-2)' }}>
              {r.label}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: SEVERITY_COLORS[r.severity] }}>
              {r.severity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ActivitiesPanel({ open, onOpen, onClose, hidden }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={`relative z-50 flex h-12 shrink-0 items-center justify-center ${open || hidden ? 'invisible' : ''}`}>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onOpen?.()}
          className="theme-fade flex items-center gap-2.5 rounded-full px-6 py-3 text-[15px] font-bold"
          style={{ background: 'var(--control-bg)', color: 'var(--text-1)', boxShadow: 'var(--control-shadow)' }}
        >
          Activities &amp; Risk
          <span className="grid h-6 w-6 place-items-center rounded-full text-[13px] font-bold" style={{ background: 'var(--yellow)', color: '#16203c' }}>
            {RISKS.length}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '108%' }}
            animate={{ y: 0 }}
            exit={{ y: '108%' }}
            transition={{ type: 'spring', damping: 27, stiffness: 240 }}
            className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[1560px] px-3 pb-3 sm:px-8 sm:pb-6 md:px-12"
          >
            <div
              className="glass theme-fade max-h-[80vh] overflow-y-auto rounded-2xl p-4 shadow-2xl sm:rounded-3xl sm:p-6"
              style={{ boxShadow: '0 -12px 50px rgba(10, 15, 40, 0.25)' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="theme-fade text-[19px] font-bold" style={{ color: 'var(--text-1)' }}>
                    Activities &amp; Risk
                  </h2>
                  <span className="grid h-6 w-6 place-items-center rounded-full text-[13px] font-bold" style={{ background: 'var(--yellow)', color: '#16203c' }}>
                    {RISKS.length}
                  </span>
                </div>
                <button
                  aria-label="Collapse panel"
                  onClick={() => onClose?.()}
                  className="theme-fade grid h-9 w-9 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95"
                  style={{ background: 'var(--control-bg)', color: 'var(--control-fg)', boxShadow: 'var(--control-shadow)' }}
                >
                  <ChevronDown />
                </button>
              </div>
              <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
                <ActivitiesTable />
                <RiskCard />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
