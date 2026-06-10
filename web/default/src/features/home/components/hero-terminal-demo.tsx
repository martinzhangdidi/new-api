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
import MinimaxIcon from '@lobehub/icons/es/Minimax'
import { cn } from '@/lib/utils'

interface HeroTerminalDemoProps {
  className?: string
}

// Packet types:
//   seg 'llm'    : between LLM node and CN Relay hub
//   seg 'trunk'  : between CN Relay and US Relay
//   seg 'country': between US Relay and country node
// dir 'fwd' = request  : country → hub → llm  (right-to-left)
// dir 'bwd' = response : llm → hub → country (left-to-right)
interface Packet {
  id: number
  seg: 'llm' | 'trunk' | 'country'
  dir: 'fwd' | 'bwd'
  fromIdx: number
  progress: number
  speed: number
  lane: number
}

const CHINA_NODES = [
  { id: 'deepseek', label: 'DeepSeek', x: 68, y: 62 },
  { id: 'qwen',     label: 'Qwen',     x: 68, y: 130 },
  { id: 'zhipu',    label: 'Zhipu',    x: 68, y: 198 },
  { id: 'minimax',  label: 'MiniMax',  x: 68, y: 266 },
]

const CHINA_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  deepseek: (p) => <DeepSeekIcon.Color size={p.size ?? 26} />,
  qwen:     (p) => <QwenIcon.Color     size={p.size ?? 26} />,
  zhipu:    (p) => <ZhipuIcon.Color    size={p.size ?? 26} />,
  minimax:  (p) => <MinimaxIcon.Color  size={p.size ?? 26} />,
}

// Left relay hub (near LLMs)
const HUB_L = { x: 210, y: 164 }
// Right relay hub (near countries)
const HUB_R = { x: 390, y: 164 }

// Trunk lanes offsets (y)
const TRUNK_LANES = [-10, -3, 3, 10]

const COUNTRY_NODES = [
  { id: 'us', label: 'United States', flag: '🇺🇸', x: 530, y: 62 },
  { id: 'ar', label: 'Argentina',     flag: '🇦🇷', x: 530, y: 130 },
  { id: 'es', label: 'Spain',         flag: '🇪🇸', x: 530, y: 198 },
  { id: 'br', label: 'Brazil',        flag: '🇧🇷', x: 530, y: 266 },
]

const STATS = [
  { label: 'Latency',     value: '~140ms', color: 'text-emerald-400' },
  { label: 'Packet Loss', value: '<0.1%',  color: 'text-blue-400' },
  { label: 'Providers',   value: '50+',    color: 'text-violet-400' },
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
  const rafRef        = useRef<number>(undefined)
  const lastRef       = useRef<number>(0)
  const llmTimer      = useRef<number>(0)
  const trunkTimer    = useRef<number>(0)
  const countryTimer  = useRef<number>(0)
  const llmBwdTimer   = useRef<number>(0)
  const trunkBwdTimer = useRef<number>(0)
  const cntryBwdTimer = useRef<number>(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    function tick(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      llmTimer.current     += dt
      trunkTimer.current   += dt
      countryTimer.current += dt
      llmBwdTimer.current  += dt
      trunkBwdTimer.current += dt
      cntryBwdTimer.current += dt

      setPackets((prev) => {
        const next = prev
          .map((p) => ({ ...p, progress: p.progress + p.speed * dt }))
          .filter((p) => p.progress < 1)

        // === RESPONSE path: LLM → CN Relay → US Relay → Country (bwd) ===
        // bwd llm seg: llm node → hub_l
        if (llmBwdTimer.current > 0.2) {
          llmBwdTimer.current = 0
          const fromIdx = Math.floor(Math.random() * CHINA_NODES.length)
          const baseSpeed = 1.2 + Math.random() * 0.4
          for (let t = 0; t < 3; t++) {
            next.push({ id: ++_pid, seg: 'llm', dir: 'bwd', fromIdx, progress: t * 0.06, speed: baseSpeed - t * 0.12, lane: 0 })
          }
        }
        // bwd trunk: hub_l → hub_r
        if (trunkBwdTimer.current > 0.1) {
          trunkBwdTimer.current = 0
          const lane = Math.floor(Math.random() * TRUNK_LANES.length)
          next.push({ id: ++_pid, seg: 'trunk', dir: 'bwd', fromIdx: 0, progress: Math.random() * 0.1, speed: 1.1 + Math.random() * 0.5, lane })
        }
        // bwd country: hub_r → country
        if (cntryBwdTimer.current > 0.22) {
          cntryBwdTimer.current = 0
          const fromIdx = Math.floor(Math.random() * COUNTRY_NODES.length)
          const baseSpeed = 1.1 + Math.random() * 0.4
          for (let t = 0; t < 3; t++) {
            next.push({ id: ++_pid, seg: 'country', dir: 'bwd', fromIdx, progress: t * 0.06, speed: baseSpeed - t * 0.1, lane: 0 })
          }
        }

        // === REQUEST path: Country → US Relay → CN Relay → LLM (fwd) ===
        // fwd country: country → hub_r
        if (countryTimer.current > 0.25) {
          countryTimer.current = 0
          const fromIdx = Math.floor(Math.random() * COUNTRY_NODES.length)
          const baseSpeed = 1.0 + Math.random() * 0.4
          for (let t = 0; t < 3; t++) {
            next.push({ id: ++_pid, seg: 'country', dir: 'fwd', fromIdx, progress: t * 0.06, speed: baseSpeed - t * 0.1, lane: 0 })
          }
        }
        // fwd trunk: hub_r → hub_l
        if (trunkTimer.current > 0.09) {
          trunkTimer.current = 0
          const lane = Math.floor(Math.random() * TRUNK_LANES.length)
          next.push({ id: ++_pid, seg: 'trunk', dir: 'fwd', fromIdx: 0, progress: Math.random() * 0.1, speed: 1.0 + Math.random() * 0.6, lane })
        }
        // fwd llm: hub_l → llm node
        if (llmTimer.current > 0.22) {
          llmTimer.current = 0
          const fromIdx = Math.floor(Math.random() * CHINA_NODES.length)
          const baseSpeed = 1.1 + Math.random() * 0.5
          for (let t = 0; t < 3; t++) {
            next.push({ id: ++_pid, seg: 'llm', dir: 'fwd', fromIdx, progress: t * 0.06, speed: baseSpeed - t * 0.12, lane: 0 })
          }
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
  const H = 335

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
            style={{ height: 'clamp(200px, 27vw, 335px)' }}
            aria-hidden='true'
          >
            <defs>
              <linearGradient id='oceanGrad2' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%'   stopColor='#7c3aed' stopOpacity='0.03' />
                <stop offset='50%'  stopColor='#1d4ed8' stopOpacity='0.09' />
                <stop offset='100%' stopColor='#7c3aed' stopOpacity='0.03' />
              </linearGradient>
              <linearGradient id='trunkGrad' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%'   stopColor='rgb(239,68,68)'  stopOpacity='0.5' />
                <stop offset='50%'  stopColor='rgb(251,146,60)' stopOpacity='0.7' />
                <stop offset='100%' stopColor='rgb(239,68,68)'  stopOpacity='0.5' />
              </linearGradient>
            </defs>

            {/* Ocean */}
            <rect x='130' y='8' width='340' height={H - 16} rx='6' fill='url(#oceanGrad2)' />
            <text x='300' y={H / 2 + 4} textAnchor='middle' fontSize='9'
              fontFamily='monospace' letterSpacing='5' fill='currentColor' opacity='0.1'>
              PACIFIC  OCEAN
            </text>

            {/* Region labels */}
            <text x='68'  y='20' textAnchor='middle' fontSize='7.5' fontFamily='monospace'
              letterSpacing='2' fill='currentColor' opacity='0.28'>CHINA</text>
            <text x='530' y='20' textAnchor='middle' fontSize='7.5' fontFamily='monospace'
              letterSpacing='2' fill='currentColor' opacity='0.28'>GLOBAL</text>

            {/* ── Thin lines: LLM → left hub ── */}
            {CHINA_NODES.map((n) => (
              <line key={n.id}
                x1={n.x} y1={n.y} x2={HUB_L.x} y2={HUB_L.y}
                stroke='rgb(167,139,250)' strokeWidth='0.8' strokeDasharray='3 5' opacity='0.3'
              />
            ))}

            {/* ── Trunk pipes: left hub → right hub (4 parallel thick lines) ── */}
            {TRUNK_LANES.map((dy, i) => (
              <line key={i}
                x1={HUB_L.x} y1={HUB_L.y + dy}
                x2={HUB_R.x} y2={HUB_R.y + dy}
                stroke='url(#trunkGrad)' strokeWidth='3.5' strokeLinecap='round' opacity='0.55'
              />
            ))}
            {/* Trunk glow overlay */}
            {TRUNK_LANES.map((dy, i) => (
              <line key={`g${i}`}
                x1={HUB_L.x} y1={HUB_L.y + dy}
                x2={HUB_R.x} y2={HUB_R.y + dy}
                stroke='rgb(251,146,60)' strokeWidth='1' opacity='0.25'
              />
            ))}

            {/* ── Thin lines: right hub → country nodes ── */}
            {COUNTRY_NODES.map((n) => (
              <line key={n.id}
                x1={HUB_R.x} y1={HUB_R.y} x2={n.x} y2={n.y}
                stroke='rgb(96,165,250)' strokeWidth='0.8' strokeDasharray='3 5' opacity='0.3'
              />
            ))}

            {/* ── Animated packets (electric arc, bidirectional) ── */}
            {packets.map((p) => {
              // llm seg: bwd = llm→hub_l, fwd = hub_l→llm
              if (p.seg === 'llm') {
                const n = CHINA_NODES[p.fromIdx]
                if (!n) return null
                const [from, to] = p.dir === 'bwd'
                  ? [n, HUB_L]
                  : [HUB_L, n]
                const pt = lerp(from, to, p.progress)
                // bwd=response: warm yellow-green; fwd=request: cool violet
                const isBwd = p.dir === 'bwd'
                const opacity = 0.45 + p.progress * 0.55
                return (
                  <circle key={p.id} cx={pt.x} cy={pt.y} r={isBwd ? 4 : 3.5}
                    style={{
                      fill: isBwd ? `rgba(250,204,21,${opacity})` : `rgba(216,180,254,${opacity})`,
                      filter: isBwd
                        ? 'drop-shadow(0 0 6px rgba(250,204,21,0.95))'
                        : 'drop-shadow(0 0 6px rgba(192,132,252,0.95))',
                    }}
                  />
                )
              }
              // trunk seg: bwd = hub_l→hub_r, fwd = hub_r→hub_l
              if (p.seg === 'trunk') {
                const dy = TRUNK_LANES[p.lane] ?? 0
                const [from, to] = p.dir === 'bwd'
                  ? [{ x: HUB_L.x, y: HUB_L.y + dy }, { x: HUB_R.x, y: HUB_R.y + dy }]
                  : [{ x: HUB_R.x, y: HUB_R.y + dy }, { x: HUB_L.x, y: HUB_L.y + dy }]
                const pt = lerp(from, to, p.progress)
                const isBwd = p.dir === 'bwd'
                return (
                  <circle key={p.id} cx={pt.x} cy={pt.y} r='3.5'
                    style={{
                      fill: isBwd ? 'rgb(253,224,71)' : 'rgb(253,186,116)',
                      filter: isBwd
                        ? 'drop-shadow(0 0 7px rgba(250,204,21,1))'
                        : 'drop-shadow(0 0 7px rgba(251,146,60,1))',
                    }}
                  />
                )
              }
              // country seg: bwd = hub_r→country, fwd = country→hub_r
              if (p.seg === 'country') {
                const n = COUNTRY_NODES[p.fromIdx]
                if (!n) return null
                const [from, to] = p.dir === 'bwd'
                  ? [HUB_R, n]
                  : [n, HUB_R]
                const pt = lerp(from, to, p.progress)
                const isBwd = p.dir === 'bwd'
                const opacity = 0.45 + (isBwd ? (1 - p.progress) : p.progress) * 0.55
                return (
                  <circle key={p.id} cx={pt.x} cy={pt.y} r='4'
                    style={{
                      fill: isBwd ? `rgba(134,239,172,${opacity})` : `rgba(147,197,253,${opacity})`,
                      filter: isBwd
                        ? 'drop-shadow(0 0 6px rgba(74,222,128,0.95))'
                        : 'drop-shadow(0 0 6px rgba(96,165,250,0.95))',
                    }}
                  />
                )
              }
              return null
            })}

            {/* ── China LLM nodes (large icons via foreignObject) ── */}
            {CHINA_NODES.map((n) => {
              const IconComp = CHINA_ICONS[n.id]
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <circle r='22' fill='rgb(139,92,246)' opacity='0.08' />
                  <foreignObject x='-14' y='-14' width='28' height='28' style={{ overflow: 'visible' }}>
                    <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {IconComp ? <IconComp size={26} /> : null}
                    </div>
                  </foreignObject>
                  <text y='30' textAnchor='middle' fontSize='8.5' fontFamily='sans-serif'
                    fontWeight='600' fill='currentColor' opacity='0.6'>{n.label}</text>
                </g>
              )
            })}

            {/* ── Left tenkb hub ── */}
            <g transform={`translate(${HUB_L.x},${HUB_L.y})`}>
              <circle r='34' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.2' opacity='0'
                style={{ animation: 'hub-pulse 1.8s ease-out infinite' }} />
              <circle r='34' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.2' opacity='0'
                style={{ animation: 'hub-pulse 1.8s ease-out infinite', animationDelay: '0.9s' }} />
              <circle r='22' fill='rgb(239,68,68)' opacity='0.15' />
              <circle r='16' fill='rgb(220,38,38)' />
              <text y='5' textAnchor='middle' fontSize='9' fontFamily='monospace'
                fontWeight='700' fill='white' letterSpacing='0.5'>tenkb</text>
              <text y='32' textAnchor='middle' fontSize='8.5' fontFamily='sans-serif'
                fontWeight='600' fill='currentColor' opacity='0.7'>CN Relay</text>
            </g>

            {/* ── Right tenkb hub ── */}
            <g transform={`translate(${HUB_R.x},${HUB_R.y})`}>
              <circle r='34' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.2' opacity='0'
                style={{ animation: 'hub-pulse 1.8s ease-out infinite', animationDelay: '0.45s' }} />
              <circle r='34' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.2' opacity='0'
                style={{ animation: 'hub-pulse 1.8s ease-out infinite', animationDelay: '1.35s' }} />
              <circle r='22' fill='rgb(239,68,68)' opacity='0.15' />
              <circle r='16' fill='rgb(220,38,38)' />
              <text y='5' textAnchor='middle' fontSize='9' fontFamily='monospace'
                fontWeight='700' fill='white' letterSpacing='0.5'>tenkb</text>
              <text y='32' textAnchor='middle' fontSize='8.5' fontFamily='sans-serif'
                fontWeight='600' fill='currentColor' opacity='0.7'>US Relay</text>
            </g>

            {/* ── Country nodes with flag emoji ── */}
            {COUNTRY_NODES.map((n) => (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <circle r='18' fill='rgb(59,130,246)' opacity='0.08' />
                {/* Flag circle */}
                <circle r='13' fill='white' opacity='0.06' />
                <foreignObject x='-13' y='-13' width='26' height='26' style={{ overflow: 'visible' }}>
                  <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1 }}>
                    {n.flag}
                  </div>
                </foreignObject>
                <text y='28' textAnchor='middle' fontSize='8' fontFamily='sans-serif'
                  fontWeight='500' fill='currentColor' opacity='0.6'>{n.label}</text>
              </g>
            ))}
          </svg>

          <style>{`
            @keyframes hub-pulse {
              0%   { r: 14; opacity: 0.65; }
              100% { r: 34; opacity: 0; }
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
