import { ImageResponse } from 'next/og'
 
// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
// Icon component
export default function Icon() {
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
          borderRadius: '8px',
        }}
      >
        {/* DN Monogram */}
        <svg
          width="28"
          height="28"
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
      </div>
    ),
    {
      ...size,
    }
  )
}
