import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Aurora visibility around Tromsø'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: 'white',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            zIndex: 10,
          }}
        >
          {/* Decorative Aurora Gradient Circle */}
          <div
            style={{
              position: 'absolute',
              top: '-150px',
              left: '200px',
              width: '800px',
              height: '800px',
              background: 'radial-gradient(circle, rgba(74, 222, 128, 0.15) 0%, rgba(0,0,0,0) 70%)',
              borderRadius: '50%',
              zIndex: -1,
            }}
          />

          <h1
            style={{
              fontSize: 60,
              fontWeight: 800,
              textAlign: 'center',
              letterSpacing: '-0.025em',
              background: 'linear-gradient(to right, #ffffff, #94a3b8)',
              backgroundClip: 'text',
              color: 'transparent',
              margin: 0,
              paddingBottom: '10px', // Prevent descender clipping
            }}
          >
            Aurora visibility
            <br />
            around Tromsø
          </h1>
          
          <div
            style={{
              fontSize: 30,
              color: '#4ade80',
              fontWeight: 600,
              marginTop: '10px',
            }}
          >
            Live conditions
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#64748b',
            letterSpacing: '0.05em',
          }}
        >
          aurora.tromso.ai
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
