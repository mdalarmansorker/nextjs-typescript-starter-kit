import { ImageResponse } from 'next/og';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Next.js Starter Kit';

export const alt = appName;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The preview image shown when a link to the site is shared (Slack, X, LinkedIn). Generated at build
 * time. Replace it with your design, or with a static `app/opengraph-image.png`.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#ededed',
        fontSize: 72,
        fontWeight: 600,
      }}
    >
      {appName}
    </div>,
    size,
  );
}
