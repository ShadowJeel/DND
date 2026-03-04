import { ImageResponse } from 'next/og'
 
// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
// Apple Icon component (for iOS home screen)
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          borderRadius: '36px',
        }}
      >
        {/* DN Monogram - Larger for Apple Icon */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* D Letter */}
          <path
            d="M4 6 L4 26 L10 26 C14 26 16 23 16 16 C16 9 14 6 10 6 L4 6 Z M7 9 L10 9 C12 9 13 11 13 16 C13 21 12 23 10 23 L7 23 Z"
            fill="#60A5FA"
          />
          
          {/* N Letter */}
          <path
            d="M17 6 L17 26 L20 26 L20 14 L25 26 L28 26 L28 6 L25 6 L25 18 L20 6 Z"
            fill="#34D399"
          />
        </svg>
        
        {/* Brand text at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '25px',
            fontSize: '18px',
            fontWeight: '700',
            color: '#9CA3AF',
            letterSpacing: '0.5px',
          }}
        >
          DND
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
