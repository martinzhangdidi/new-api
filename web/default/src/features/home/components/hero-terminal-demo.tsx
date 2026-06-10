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
//   seg 'trunk'  : between CN Relay hub and a global relay node
//   seg 'mesh'   : between global relay nodes (inter-node mesh)
// dir 'fwd' = request  : global → cn → llm  (right-to-left)
// dir 'bwd' = response : llm → cn → global  (left-to-right)
interface Packet {
  id: number
  seg: 'llm' | 'trunk' | 'mesh'
  dir: 'fwd' | 'bwd'
  fromIdx: number
  toIdx: number
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

// CN Relay hub (left side, near LLMs)
const HUB_CN = { x: 195, y: 168 }

// Global Relay network nodes (Americas + Spain, larger relay-like sizes)
const GLOBAL_NODES = [
  { id: 'us',  label: '\u{1F1FA}\u{1F1F8}', x: 390, y: 68,  r: 22 },
  { id: 'ca',  label: '\u{1F1E8}\u{1F1E6}', x: 470, y: 55,  r: 18 },
  { id: 'mx',  label: '\u{1F1F2}\u{1F1FD}', x: 545, y: 95,  r: 17 },
  { id: 'br',  label: '\u{1F1E7}\u{1F1F7}', x: 535, y: 175, r: 20 },
  { id: 'ar',  label: '\u{1F1E6}\u{1F1F7}', x: 440, y: 205, r: 17 },
  { id: 'cl',  label: '\u{1F1E8}\u{1F1F1}', x: 545, y: 255, r: 16 },
  { id: 'co',  label: '\u{1F1E8}\u{1F1F4}', x: 380, y: 180, r: 16 },
  { id: 'pe',  label: '\u{1F1F5}\u{1F1EA}', x: 450, y: 285, r: 15 },
  { id: 'es',  label: '\u{1F1EA}\u{1F1F8}', x: 370, y: 275, r: 17 },
]

// Pre-computed mesh edges between nearby global nodes
const MESH_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 3],
  [3, 5], [4, 5], [4, 7], [5, 6], [6, 7], [6, 8], [5, 8],
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
  const rafRef       = useRef<number>(undefined)
  const lastRef      = useRef<number>(0)
  const llmTimer     = useRef<number>(0)
  const trunkTimer   = useRef<number>(0)
  const meshTimer    = useRef<number>(0)
  const llmBwdTimer  = useRef<number>(0)
  const trunkBwdTimer = useRef<number>(0)
  const meshBwdTimer = useRef<number>(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    function tick(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      llmTimer.current      += dt
      trunkTimer.current    += dt
      meshTimer.current     += dt
      llmBwdTimer.current   += dt
      trunkBwdTimer.current += dt
      meshBwdTimer.current  += dt

      setPackets((prev) => {
        const next = prev
          .map((p) => ({ ...p, progress: p.progress + p.speed * dt }))
          .filter((p) => p.progress < 1)

        // === RESPONSE: LLM → CN Relay → Global nodes (bwd) ===
        if (llmBwdTimer.current > 0.2) {
          llmBwdTimer.current = 0
          const fromIdx = Math.floor(Math.random() * CHINA_NODES.length)
          const baseSpeed = 1.2 + Math.random() * 0.4
          for (let t = 0; t < 3; t++) {
            next.push({ id: ++_pid, seg: 'llm', dir: 'bwd', fromIdx, toIdx: 0, progress: t * 0.06, speed: baseSpeed - t * 0.12, lane: 0 })
          }
        }
        // bwd trunk: CN hub → global node
        if (trunkBwdTimer.current > 0.12) {
          trunkBwdTimer.current = 0
          const toIdx = Math.floor(Math.random() * GLOBAL_NODES.length)
          next.push({ id: ++_pid, seg: 'trunk', dir: 'bwd', fromIdx: 0, toIdx, progress: Math.random() * 0.08, speed: 0.9 + Math.random() * 0.5, lane: 0 })
        }
        // bwd mesh: between global nodes
        if (meshBwdTimer.current > 0.25) {
          meshBwdTimer.current = 0
          const edgeIdx = Math.floor(Math.random() * MESH_EDGES.length)
          const [a, b] = MESH_EDGES[edgeIdx]
          next.push({ id: ++_pid, seg: 'mesh', dir: 'bwd', fromIdx: a, toIdx: b, progress: 0, speed: 1.0 + Math.random() * 0.6, lane: 0 })
        }

        // === REQUEST: Global nodes → CN Relay → LLM (fwd) ===
        // fwd trunk: global node → CN hub
        if (trunkTimer.current > 0.15) {
          trunkTimer.current = 0
          const fromIdx = Math.floor(Math.random() * GLOBAL_NODES.length)
          next.push({ id: ++_pid, seg: 'trunk', dir: 'fwd', fromIdx, toIdx: 0, progress: Math.random() * 0.08, speed: 0.9 + Math.random() * 0.5, lane: 0 })
        }
        // fwd mesh: between global nodes
        if (meshTimer.current > 0.3) {
          meshTimer.current = 0
          const edgeIdx = Math.floor(Math.random() * MESH_EDGES.length)
          const [a, b] = MESH_EDGES[edgeIdx]
          next.push({ id: ++_pid, seg: 'mesh', dir: 'fwd', fromIdx: b, toIdx: a, progress: 0, speed: 1.0 + Math.random() * 0.6, lane: 0 })
        }
        // fwd llm: CN hub → llm node
        if (llmTimer.current > 0.22) {
          llmTimer.current = 0
          const fromIdx = Math.floor(Math.random() * CHINA_NODES.length)
          const baseSpeed = 1.1 + Math.random() * 0.5
          for (let t = 0; t < 3; t++) {
            next.push({ id: ++_pid, seg: 'llm', dir: 'fwd', fromIdx, toIdx: 0, progress: t * 0.06, speed: baseSpeed - t * 0.12, lane: 0 })
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
              <radialGradient id='hubGlow'>
                <stop offset='0%' stopColor='rgb(239,68,68)' stopOpacity='0.4' />
                <stop offset='60%' stopColor='rgb(239,68,68)' stopOpacity='0.08' />
                <stop offset='100%' stopColor='rgb(239,68,68)' stopOpacity='0' />
              </radialGradient>
              <radialGradient id='earthGlow' cx='50%' cy='50%' r='50%'>
                <stop offset='0%' stopColor='currentColor' stopOpacity='0.04' />
                <stop offset='70%' stopColor='currentColor' stopOpacity='0.02' />
                <stop offset='100%' stopColor='currentColor' stopOpacity='0' />
              </radialGradient>
            </defs>

            {/* ── Globe background (replaces rect) ── */}
            <g transform={`translate(${W / 2},${H / 2})`}>
              <circle r='145' fill='url(#earthGlow)' />
              <circle r='140' fill='none' stroke='currentColor' strokeWidth='0.6' opacity='0.08' />
              <circle r='100' fill='none' stroke='currentColor' strokeWidth='0.4' opacity='0.06' />
              <ellipse rx='140' ry='50' fill='none' stroke='currentColor' strokeWidth='0.4' opacity='0.06' />
              <ellipse rx='140' ry='90' fill='none' stroke='currentColor' strokeWidth='0.3' opacity='0.05' />
              <ellipse rx='50' ry='140' fill='none' stroke='currentColor' strokeWidth='0.4' opacity='0.06' />
              <ellipse rx='90' ry='140' fill='none' stroke='currentColor' strokeWidth='0.3' opacity='0.05' />
              <line x1='-140' y1='0' x2='140' y2='0' stroke='currentColor' strokeWidth='0.3' opacity='0.05' />
              <line x1='0' y1='-140' x2='0' y2='140' stroke='currentColor' strokeWidth='0.3' opacity='0.05' />
            </g>

            {/* Region labels */}
            <text x='68' y='22' textAnchor='middle' fontSize='10' fontFamily='monospace'
              fontWeight='700' letterSpacing='2' fill='currentColor' opacity='0.55'>CHINA</text>
            <text x='460' y='22' textAnchor='middle' fontSize='10' fontFamily='monospace'
              fontWeight='700' letterSpacing='2' fill='currentColor' opacity='0.55'>GLOBAL RELAY</text>

            {/* ── Lines: LLM nodes → CN hub ── */}
            {CHINA_NODES.map((n) => (
              <g key={n.id}>
                <line x1={n.x} y1={n.y} x2={HUB_CN.x} y2={HUB_CN.y}
                  stroke='rgb(167,139,250)' strokeWidth='0.6' opacity='0.15' />
                <line x1={n.x} y1={n.y} x2={HUB_CN.x} y2={HUB_CN.y}
                  stroke='rgb(167,139,250)' strokeWidth='1.2' strokeDasharray='6 12'
                  opacity='0.4' className='animate-flow-left' />
              </g>
            ))}

            {/* ── Lines: CN hub → each global node (trunk) ── */}
            {GLOBAL_NODES.map((n) => (
              <g key={n.id}>
                <line x1={HUB_CN.x} y1={HUB_CN.y} x2={n.x} y2={n.y}
                  stroke='rgb(251,146,60)' strokeWidth='0.5' opacity='0.12' />
                <line x1={HUB_CN.x} y1={HUB_CN.y} x2={n.x} y2={n.y}
                  stroke='rgb(251,146,60)' strokeWidth='1' strokeDasharray='5 14'
                  opacity='0.35' className='animate-flow-right' />
              </g>
            ))}

            {/* ── Mesh edges between global nodes ── */}
            {MESH_EDGES.map(([a, b], i) => (
              <line key={`mesh${i}`}
                x1={GLOBAL_NODES[a].x} y1={GLOBAL_NODES[a].y}
                x2={GLOBAL_NODES[b].x} y2={GLOBAL_NODES[b].y}
                stroke='rgb(96,165,250)' strokeWidth='0.5' strokeDasharray='3 8'
                opacity='0.25' className='animate-flow-mesh' />
            ))}

            {/* ── Animated packets with comet tails ── */}
            {packets.map((p) => {
              let from: { x: number; y: number }
              let to: { x: number; y: number }
              let color: string
              let glowColor: string

              if (p.seg === 'llm') {
                const n = CHINA_NODES[p.fromIdx]
                if (!n) return null
                ;[from, to] = p.dir === 'bwd' ? [n, HUB_CN] : [HUB_CN, n]
                color = p.dir === 'bwd' ? 'rgb(250,204,21)' : 'rgb(216,180,254)'
                glowColor = p.dir === 'bwd' ? 'rgba(250,204,21,0.9)' : 'rgba(192,132,252,0.9)'
              } else if (p.seg === 'trunk') {
                const gn = GLOBAL_NODES[p.dir === 'bwd' ? p.toIdx : p.fromIdx]
                if (!gn) return null
                ;[from, to] = p.dir === 'bwd' ? [HUB_CN, gn] : [gn, HUB_CN]
                color = p.dir === 'bwd' ? 'rgb(253,224,71)' : 'rgb(253,186,116)'
                glowColor = p.dir === 'bwd' ? 'rgba(250,204,21,1)' : 'rgba(251,146,60,1)'
              } else if (p.seg === 'mesh') {
                const na = GLOBAL_NODES[p.fromIdx]
                const nb = GLOBAL_NODES[p.toIdx]
                if (!na || !nb) return null
                from = na; to = nb
                color = p.dir === 'bwd' ? 'rgb(134,239,172)' : 'rgb(147,197,253)'
                glowColor = p.dir === 'bwd' ? 'rgba(74,222,128,0.9)' : 'rgba(96,165,250,0.9)'
              } else {
                return null
              }

              const pt = lerp(from, to, p.progress)
              const tail = lerp(from, to, Math.max(0, p.progress - 0.12))
              return (
                <g key={p.id}>
                  <line x1={tail.x} y1={tail.y} x2={pt.x} y2={pt.y}
                    stroke={color} strokeWidth='2' strokeLinecap='round'
                    opacity={0.3 + p.progress * 0.4} />
                  <circle cx={pt.x} cy={pt.y} r='2.5'
                    fill={color} opacity={0.7 + p.progress * 0.3}
                    style={{ filter: `drop-shadow(0 0 5px ${glowColor})` }} />
                </g>
              )
            })}

            {/* ── China LLM nodes ── */}
            {CHINA_NODES.map((n) => {
              const IconComp = CHINA_ICONS[n.id]
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <circle r='22' fill='none' stroke='rgb(167,139,250)' strokeWidth='0.8'
                    opacity='0' className='animate-node-breathe' />
                  <circle r='16' fill='rgb(139,92,246)' opacity='0.08' />
                  <foreignObject x='-14' y='-14' width='28' height='28' style={{ overflow: 'visible' }}>
                    <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {IconComp ? <IconComp size={26} /> : null}
                    </div>
                  </foreignObject>
                  <text y='32' textAnchor='middle' fontSize='8.5' fontFamily='sans-serif'
                    fontWeight='600' fill='currentColor' opacity='0.6'>{n.label}</text>
                </g>
              )
            })}

            {/* ── CN Relay hub ── */}
            <g transform={`translate(${HUB_CN.x},${HUB_CN.y})`}>
              <circle r='40' fill='url(#hubGlow)' />
              <circle r='34' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.2' opacity='0'
                style={{ animation: 'hub-pulse 1.8s ease-out infinite' }} />
              <circle r='34' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.2' opacity='0'
                style={{ animation: 'hub-pulse 1.8s ease-out infinite', animationDelay: '0.9s' }} />
              <circle r='22' fill='rgb(239,68,68)' opacity='0.18' />
              <circle r='16' fill='rgb(220,38,38)' />
              <text y='5' textAnchor='middle' fontSize='9' fontFamily='monospace'
                fontWeight='700' fill='white' letterSpacing='0.5'>tenkb</text>
              <text y='34' textAnchor='middle' fontSize='8.5' fontFamily='sans-serif'
                fontWeight='600' fill='currentColor' opacity='0.7'>CN Relay</text>
            </g>

            {/* ── Global relay nodes (scattered network) ── */}
            {GLOBAL_NODES.map((n) => (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <circle r={n.r + 6} fill='rgb(59,130,246)' opacity='0.05' />
                <circle r={n.r + 2} fill='none' stroke='rgb(96,165,250)' strokeWidth='1'
                  opacity='0' className='animate-node-breathe' />
                <circle r={n.r} fill='rgb(30,64,175)' opacity='0.12' />
                <foreignObject x={-(n.r - 2)} y={-(n.r - 2)} width={(n.r - 2) * 2} height={(n.r - 2) * 2} style={{ overflow: 'visible' }}>
                  <div style={{ width: (n.r - 2) * 2, height: (n.r - 2) * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: n.r * 1.1, lineHeight: 1 }}>
                    {n.label}
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>

          <style>{`
            @keyframes hub-pulse {
              0%   { r: 14; opacity: 0.65; }
              100% { r: 34; opacity: 0; }
            }
            @keyframes flow-left {
              0%   { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -36; }
            }
            @keyframes flow-right {
              0%   { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 36; }
            }
            @keyframes flow-mesh {
              0%   { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 22; }
            }
            @keyframes node-breathe {
              0%, 100% { opacity: 0.15; }
              50%      { opacity: 0.45; }
            }
            .animate-flow-left {
              animation: flow-left 1.2s linear infinite;
            }
            .animate-flow-right {
              animation: flow-right 1.2s linear infinite;
            }
            .animate-flow-mesh {
              animation: flow-mesh 1.5s linear infinite;
            }
            .animate-node-breathe {
              animation: node-breathe 2.5s ease-in-out infinite;
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
