import React from 'react';

type ImageVariant = 'default' | 'card' | 'thumb';
type HeritageCategory = 'Cultural' | 'Natural' | 'Mixed';

const DIRECT_IMAGE_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;

const CATEGORY_STYLES: Record<
  HeritageCategory,
  {
    accent: string;
    glow: string;
    label: string;
  }
> = {
  Cultural: {
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.18)',
    label: 'CULTURAL',
  },
  Natural: {
    accent: '#4ade80',
    glow: 'rgba(74,222,128,0.18)',
    label: 'NATURAL',
  },
  Mixed: {
    accent: '#60a5fa',
    glow: 'rgba(96,165,250,0.18)',
    label: 'MIXED',
  },
};

const sanitize = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPlaceholder = ({
  title,
  subtitle,
  category = 'Cultural',
  variant = 'default',
}: {
  title: string;
  subtitle?: string;
  category?: HeritageCategory;
  variant?: ImageVariant;
}) => {
  const style = CATEGORY_STYLES[category];
  const width = variant === 'thumb' ? 320 : 800;
  const height = variant === 'thumb' ? 320 : 600;
  const titleFontSize = variant === 'thumb' ? 36 : variant === 'card' ? 46 : 58;
  const subtitleFontSize = variant === 'thumb' ? 17 : 20;
  const labelFontSize = variant === 'thumb' ? 14 : 16;
  const safeTitle = sanitize(title);
  const safeSubtitle = sanitize(subtitle || style.label);
  const titleY = variant === 'thumb' ? height - 76 : height - 120;
  const subtitleY = variant === 'thumb' ? height - 38 : height - 72;

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#181818" />
      <stop offset="100%" stop-color="#090909" />
    </linearGradient>
    <linearGradient id="accent" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${style.accent}" stop-opacity="0.92" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <circle cx="${Math.round(width * 0.2)}" cy="${Math.round(height * 0.22)}" r="${Math.round(width * 0.14)}" fill="${style.glow}" />
  <circle cx="${Math.round(width * 0.86)}" cy="${Math.round(height * 0.76)}" r="${Math.round(width * 0.19)}" fill="rgba(255,255,255,0.05)" />
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#accent)" opacity="0.18" />
  <line x1="${Math.round(width * 0.08)}" y1="${Math.round(height * 0.16)}" x2="${Math.round(width * 0.34)}" y2="${Math.round(height * 0.16)}" stroke="${style.accent}" stroke-width="4" stroke-linecap="round" />
  <text x="${Math.round(width * 0.08)}" y="${titleY}" fill="rgba(255,255,255,0.92)" font-family="Georgia, serif" font-size="${titleFontSize}" font-style="italic">
    ${safeTitle}
  </text>
  <text x="${Math.round(width * 0.08)}" y="${subtitleY}" fill="rgba(255,255,255,0.46)" font-family="Arial, sans-serif" font-size="${subtitleFontSize}" letter-spacing="5">
    ${safeSubtitle}
  </text>
  <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.16) - 14}" fill="${style.accent}" font-family="Arial, sans-serif" font-size="${labelFontSize}" letter-spacing="4">
    UNESCO WORLD HERITAGE
  </text>
</svg>
`)}`;
};

const isLikelyDirectImage = (src?: string | null) => Boolean(src && DIRECT_IMAGE_PATTERN.test(src));

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  title?: string;
  subtitle?: string;
  category?: HeritageCategory;
  variant?: ImageVariant;
};

export const SafeImage = ({
  src,
  alt = '',
  onError,
  title = 'World Heritage',
  subtitle,
  category = 'Cultural',
  variant = 'default',
  ...props
}: SafeImageProps) => {
  const fallbackSrc = React.useMemo(
    () => buildPlaceholder({ title, subtitle, category, variant }),
    [title, subtitle, category, variant],
  );

  const [resolvedSrc, setResolvedSrc] = React.useState(isLikelyDirectImage(src) ? src! : fallbackSrc);

  React.useEffect(() => {
    setResolvedSrc(isLikelyDirectImage(src) ? src! : fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={(event) => {
        if (resolvedSrc !== fallbackSrc) {
          setResolvedSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
};
