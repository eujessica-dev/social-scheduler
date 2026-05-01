'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string          // ISO datetime string or ''
  onChange: (v: string) => void
}

// Portuguese month/weekday names
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// Quick-time presets
const PRESETS = [
  { label: 'Manhã',   h: '08', m: '00' },
  { label: 'Almoço',  h: '12', m: '00' },
  { label: 'Tarde',   h: '15', m: '00' },
  { label: 'Noite',   h: '19', m: '00' },
  { label: 'Noit. +', h: '21', m: '00' },
]

function pad(n: number) { return String(n).padStart(2, '0') }

function toLocalIso(date: Date, hh: string, mm: string) {
  const y = date.getFullYear()
  const mo = pad(date.getMonth() + 1)
  const d  = pad(date.getDate())
  return `${y}-${mo}-${d}T${hh}:${mm}`
}

function formatPreview(date: Date | null, hh: string, mm: string): string {
  if (!date) return ''
  const wd = WEEKDAYS_SHORT[date.getDay()]
  const d  = date.getDate()
  const mo = MONTHS[date.getMonth()]
  const y  = date.getFullYear()
  return `${wd}, ${d} de ${mo} de ${y} às ${hh}h${mm}`
}

export function SchedulePicker({ value, onChange }: Props) {
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const maxDate  = new Date(today.getFullYear(), 11, 31) // Dec 31

  // ── parse incoming value ─────────────────────────────────────────────────
  const parseValue = (v: string) => {
    if (!v) return { date: null, hh: '09', mm: '00' }
    const [datePart, timePart] = v.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    const parsed = new Date(y, mo - 1, d); parsed.setHours(0, 0, 0, 0)
    const [hh = '09', mm = '00'] = (timePart ?? '09:00').split(':')
    return { date: parsed, hh: hh.slice(0, 2), mm: mm.slice(0, 2) }
  }

  const init = parseValue(value)
  const [selectedDate, setSelectedDate] = useState<Date | null>(init.date)
  const [hh, setHh] = useState(init.hh)
  const [mm, setMm] = useState(init.mm)

  // calendar navigation
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [open, setOpen]           = useState(false)

  // Emit combined value whenever any part changes
  useEffect(() => {
    if (!selectedDate) { onChange(''); return }
    onChange(toLocalIso(selectedDate, hh, mm))
  }, [selectedDate, hh, mm])

  // ── calendar helpers ─────────────────────────────────────────────────────
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const firstDow    = (y: number, m: number) => new Date(y, m, 1).getDay()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const canPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth())
  const canNext = !(viewYear === maxDate.getFullYear() && viewMonth === maxDate.getMonth())

  const pickDay = (d: number) => {
    const picked = new Date(viewYear, viewMonth, d)
    setSelectedDate(picked)
  }

  const isDisabled = (d: number) => {
    const date = new Date(viewYear, viewMonth, d)
    return date < today || date > maxDate
  }

  const isSelected = (d: number) =>
    selectedDate?.getFullYear() === viewYear &&
    selectedDate?.getMonth() === viewMonth &&
    selectedDate?.getDate() === d

  const isToday = (d: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === d

  const clear = () => { setSelectedDate(null); onChange('') }

  const preview = formatPreview(selectedDate, hh, mm)

  // ── Generate calendar grid ───────────────────────────────────────────────
  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDow  = firstDow(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-3">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 border rounded-xl text-sm transition-all',
          open
            ? 'border-violet-400 ring-2 ring-violet-100 bg-white'
            : 'border-gray-200 hover:border-violet-300 bg-white',
        )}
      >
        <CalendarDays className="w-4 h-4 text-violet-500 flex-shrink-0" />
        {selectedDate ? (
          <span className="flex-1 text-left text-gray-800 font-medium">{preview}</span>
        ) : (
          <span className="flex-1 text-left text-gray-400">Selecionar data e hora</span>
        )}
        {selectedDate && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); clear() }}
            className="text-gray-300 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </span>
        )}
      </button>

      {/* Picker panel */}
      {open && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">

          {/* ── Calendar ─────────────────────────────────────────────────── */}
          <div className="p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!canPrev}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              <span className="font-semibold text-gray-900 text-sm capitalize">
                {MONTHS[viewMonth]} {viewYear}
              </span>

              <button
                type="button"
                onClick={nextMonth}
                disabled={!canNext}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS_SHORT.map((wd) => (
                <div key={wd} className="text-center text-[11px] font-medium text-gray-400 py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />
                const disabled  = isDisabled(day)
                const selected  = isSelected(day)
                const todayCell = isToday(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !disabled && pickDay(day)}
                    disabled={disabled}
                    className={cn(
                      'h-8 w-full rounded-lg text-xs font-medium transition-all',
                      selected
                        ? 'bg-violet-600 text-white shadow-sm'
                        : todayCell
                        ? 'border border-violet-300 text-violet-700 hover:bg-violet-50'
                        : disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-violet-50 hover:text-violet-700',
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Time picker ───────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              Horário
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((p) => {
                const active = hh === p.h && mm === p.m
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setHh(p.h); setMm(p.m) }}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-lg font-medium transition-all',
                      active
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700',
                    )}
                  >
                    {p.label}
                    <span className={cn('ml-1.5 font-normal', active ? 'text-violet-200' : 'text-gray-400')}>
                      {p.h}h{p.m !== '00' ? p.m : ''}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Hour + Minute selects */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-1 font-medium">Hora</label>
                <div className="relative">
                  <select
                    value={hh}
                    onChange={(e) => setHh(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 text-center cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xl font-bold text-gray-400 mt-4">:</div>

              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-1 font-medium">Minuto</label>
                <select
                  value={mm}
                  onChange={(e) => setMm(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 text-center cursor-pointer"
                >
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map((m) => (
                    <option key={m} value={m}>{m}min</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview badge */}
            {selectedDate && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5 text-center">
                <p className="text-xs text-violet-500 font-medium">Agendado para</p>
                <p className="text-sm text-violet-800 font-semibold mt-0.5">{preview}</p>
              </div>
            )}

            {/* Confirm button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!selectedDate}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {selectedDate ? 'Confirmar agendamento' : 'Selecione uma data'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
