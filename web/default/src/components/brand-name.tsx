import React from 'react'

export function BrandName() {
  return (
    <>
      <span style={{ color: '#000000' }}>ten</span>
      <span style={{ color: '#FF3333' }}>kb</span>
    </>
  )
}

export function renderBrandInText(text: string): React.ReactNode[] {
  const parts = text.split(/(tenkb)/i)
  return parts.map((part, i) => {
    if (part.toLowerCase() === 'tenkb') {
      return (
        <React.Fragment key={i}>
          <span style={{ color: '#000000' }}>ten</span>
          <span style={{ color: '#FF3333' }}>kb</span>
        </React.Fragment>
      )
    }
    return part
  })
}
