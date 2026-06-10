/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import React, { useState, useEffect, useRef } from 'react'
import DeepSeekIcon from '@lobehub/icons/es/DeepSeek'
import QwenIcon from '@lobehub/icons/es/Qwen'
import ZhipuIcon from '@lobehub/icons/es/Zhipu'
import BaiduIcon from '@lobehub/icons/es/Baidu'
import { cn } from '@/lib/utils'

interface HeroTerminalDemoProps {
  className?: string
}

interface Packet {
  id: number
  routeIdx: number
  progress: number
  speed: number
}

const CHINA_NODES = [
  { id: 'deepseek', label: 'DeepSeek', x: 72, y: 65 },
  { id: 'qwen',     label: 'Qwen',     x: 72, y: 125 },
  { id: 'zhipu',    label: 'Zhipu',    x: 72, y: 185 },
  { id: 'baidu',    label: 'Baidu',    x: 72, y: 245 },
]

const CHINA_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  deepseek: (p) => <DeepSeekIcon.Color size={p.size ?? 20} />,
  qwen:     (p) => <QwenIcon.Color     size={p.size ?? 20} />,
  zhipu:    (p) => <ZhipuIcon.Color    size={p.size ?? 20} />,
  baidu:    (p) => <BaiduIcon.Color    size={p.size ?? 20} />,
}

const HUB = { x: 300, y: 155 }

const US_NODES = [
  { id: 'seattle', label: 'Seattle',     x: 528, y: 65 },
  { id: 'sf',      label: 'San Jose',    x: 528, y: 125 },
  { id: 'la',      label: 'Los Angeles', x: 528, y: 185 },
  { id: 'nyc',     label: 'New York',    x: 528, y: 245 },
]

const CHINA_ROUTES = CHINA_NODES.map((n) => ({ from: n, to: HUB }))
const US_ROUTES    = US_NODES.map((n)    => ({ from: HUB, to: n }))
const ALL_ROUTES   = [...CHINA_ROUTES, ...US_ROUTES]

const STATS = [
  { label: 'Latency',   value: '~140ms', color: 'text-emerald-400' },
  { label: 'Packet Loss', value: '<0.1%', color: 'text-blue-400' },
  { label: 'Providers', value: '50+',    color: 'text-violet-400' },
]

let _pid = 0

function lerp(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number
) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function HeroTerminalDemo(props: HeroTerminalDemoProps) {
  const [packets, setPackets] = useState<Packet[]>([])
  const rafRef  = useRef<number>(undefined)
  const lastRef = useRef<number>(0)
  const spawnRef = useRef<number>(0)
  const sideRef  = useRef<0 | 1>(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    function tick(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      spawnRef.current += dt

      setPackets((prev) => {
        const next = prev
          .map((p) => ({ ...p, progress: p.progress + p.speed * dt }))
          .filter((p) => p.progress < 1)

        if (spawnRef.current > 0.42) {
          spawnRef.current = 0
          const side = sideRef.current
          sideRef.current = side === 0 ? 1 : 0
          const pool = side === 0 ? CHINA_ROUTES : US_ROUTES
          const route = pool[Math.floor(Math.random() * pool.length)]
          const routeIdx = ALL_ROUTES.indexOf(route)
          next.push({ id: ++_pid, routeIdx, progress: 0, speed: 0.22 + Math.random() * 0.15 })
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const W = 600
  const H = 315

  return (
    <div className={cn('mx-auto w-full max-w-2xl', props.className)}>
      <div
        className={cn(
          'overflow-hidden rounded-2xl border backdrop-blur-sm',
          'border-border/60 bg-white/95 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.18)]',
          'dark:border-white/[0.06] dark:bg-[#0b0f17]/95 dark:shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)]'
        )}
      >
        {/* Header bar */}
        <div
          className={cn(
            'flex items-center gap-2 border-b px-4 py-3',
            'border-border/50 dark:border-white/[0.05]'
          )}
        >
          <span className='size-2.5 rounded-full bg-red-400/80' />
          <span className='size-2.5 rounded-full bg-amber-400/80' />
          <span className='size-2.5 rounded-full bg-emerald-400/80' />
          <span className='text-foreground/40 ml-3 font-mono text-[11px] tracking-widest uppercase'>
            tenkb network · Trans-Pacific
          </span>
          <div className='ml-auto flex items-center gap-1.5'>
            <span className='inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' />
            <span className='text-foreground/40 font-mono text-[10px] tracking-wider uppercase'>
              active
            </span>
          </div>
        </div>

        {/* Map SVG */}
        <div className='px-3 pt-3 pb-1'>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className='w-full'
            style={{ height: 'clamp(190px, 26vw, 315px)' }}
            aria-hidden='true'
          >
            <defs>
              <linearGradient id='oceanGrad' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%'   stopColor='#7c3aed' stopOpacity='0.04' />
                <stop offset='50%'  stopColor='#2563eb' stopOpacity='0.08' />
                <stop offset='100%' stopColor='#7c3aed' stopOpacity='0.04' />
              </linearGradient>
            </defs>

            {/* Ocean background */}
            <rect x='115' y='10' width='370' height={H - 20} rx='8' fill='url(#oceanGrad)' />
            <text x='300' y={H / 2 + 4} textAnchor='middle' fontSize='10'
              fontFamily='monospace' letterSpacing='4'
              fill='currentColor' opacity='0.12'>
              PACIFIC  OCEAN
            </text>

            {/* Region labels */}
            <text x='72' y='22' textAnchor='middle' fontSize='8' fontFamily='monospace'
              letterSpacing='2' fill='currentColor' opacity='0.3'>CHINA</text>
            <text x='528' y='22' textAnchor='middle' fontSize='8' fontFamily='monospace'
              letterSpacing='2' fill='currentColor' opacity='0.3'>AMERICAS</text>

            {/* Lines: china nodes -> hub */}
            {CHINA_NODES.map((n) => (
              <line key={n.id}
                x1={n.x} y1={n.y} x2={HUB.x} y2={HUB.y}
                stroke='currentColor' strokeWidth='0.8' strokeDasharray='4 5' opacity='0.25'
              />
            ))}

            {/* Lines: hub -> us nodes */}
            {US_NODES.map((n) => (
              <line key={n.id}
                x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y}
                stroke='currentColor' strokeWidth='0.8' strokeDasharray='4 5' opacity='0.25'
              />
            ))}

            {/* Animated packets */}
            {packets.map((p) => {
              const route = ALL_ROUTES[p.routeIdx]
              if (!route) return null
              const pt = lerp(route.from, route.to, p.progress)
              const isChinaSide = p.routeIdx < CHINA_ROUTES.length
              return (
                <circle key={p.id} cx={pt.x} cy={pt.y} r='3'
                  style={{
                    fill: isChinaSide ? 'rgb(167,139,250)' : 'rgb(96,165,250)',
                    filter: isChinaSide
                      ? 'drop-shadow(0 0 5px rgba(167,139,250,0.9))'
                      : 'drop-shadow(0 0 5px rgba(96,165,250,0.9))',
                  }}
                />
              )
            })}

            {/* China nodes — rendered as foreignObject to use React icon components */}
            {CHINA_NODES.map((n) => {
              const IconComp = CHINA_ICONS[n.id]
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <circle r='18' fill='rgb(139,92,246)' opacity='0.08' />
                  <circle r='13' fill='white' opacity='0.07' />
                  <foreignObject x='-11' y='-11' width='22' height='22' style={{ overflow: 'visible' }}>
                    <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {IconComp ? <IconComp size={20} /> : null}
                    </div>
                  </foreignObject>
                  <text y='26' textAnchor='middle' fontSize='9' fontFamily='sans-serif'
                    fontWeight='500' fill='currentColor' opacity='0.6'>{n.label}</text>
                </g>
              )
            })}

            {/* Hub: tenkb */}
            <g transform={`translate(${HUB.x},${HUB.y})`}>
              <circle r='30' fill='none' stroke='rgb(239,68,68)' strokeWidth='1' opacity='0'
                style={{ animation: 'hub-pulse 2.4s ease-out infinite' }} />
              <circle r='30' fill='none' stroke='rgb(239,68,68)' strokeWidth='1' opacity='0'
                style={{ animation: 'hub-pulse 2.4s ease-out infinite', animationDelay: '1.2s' }} />
              <circle r='20' fill='rgb(239,68,68)' opacity='0.1' />
              <circle r='13' fill='rgb(220,38,38)' />
              <text y='4' textAnchor='middle' fontSize='7.5' fontFamily='monospace'
                fontWeight='700' fill='white' letterSpacing='0.5'>tenkb</text>
              <text y='32' textAnchor='middle' fontSize='9' fontFamily='sans-serif'
                fontWeight='600' fill='currentColor' opacity='0.75'>tenkb network</text>
              <text y='43' textAnchor='middle' fontSize='8' fontFamily='monospace'
                fill='currentColor' opacity='0.35'>QUIC · BBR3</text>
            </g>

            {/* US nodes */}
            {US_NODES.map((n) => (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <circle r='13' fill='rgb(59,130,246)' opacity='0.15' />
                <circle r='7'  fill='rgb(59,130,246)' opacity='0.85' />
                <text y='22' textAnchor='middle' fontSize='9' fontFamily='sans-serif'
                  fontWeight='500' fill='currentColor' opacity='0.65'>{n.label}</text>
              </g>
            ))}
          </svg>

          <style>{`
            @keyframes hub-pulse {
              0%   { r: 16; opacity: 0.6; }
              100% { r: 36; opacity: 0; }
            }
          `}</style>
        </div>

        {/* Stats row */}
        <div
          className={cn(
            'flex items-center justify-around border-t px-5 py-3',
            'border-border/40 bg-muted/30 dark:border-white/[0.05] dark:bg-white/[0.02]'
          )}
        >
          {STATS.map((s) => (
            <div key={s.label} className='flex flex-col items-center gap-0.5'>
              <span className={cn('font-mono text-sm font-semibold tabular-nums', s.color)}>
                {s.value}
              </span>
              <span className='text-foreground/40 text-[10px] tracking-wider uppercase'>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Protocol badges */}
        <div
          className={cn(
            'flex items-center gap-2 border-t px-5 py-2.5',
            'border-border/40 dark:border-white/[0.05]'
          )}
        >
          {['QUIC / UDP', 'BBR3', 'TLS 1.3', 'Zero-Log'].map((badge) => (
            <span
              key={badge}
              className={cn(
                'rounded-md px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide',
                'bg-muted/60 text-foreground/50 dark:bg-white/[0.06] dark:text-white/40'
              )}
            >
              {badge}
            </span>
          ))}
          <span className='text-foreground/30 ml-auto font-mono text-[10px] tracking-wider uppercase'>
            tenkb network
          </span>
        </div>
      </div>
    </div>
  )
}
