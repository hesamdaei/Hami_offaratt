import { FC } from 'react';

interface LaserPrintWatermarkProps {
  enabled: boolean;
  text: string;
  subText?: string;
  opacity?: number;
  fontSizePt?: number;
  className?: string;
}

/**
 * High-Clarity, Zero-Toner-Waste Laser Printer Watermark
 * Renders diagonally across the printable page with laser-safe faint opacity (default 4%).
 * Non-blocking for scanners, OCR, and high-speed office laser printers.
 */
export const LaserPrintWatermark: FC<LaserPrintWatermarkProps> = ({
  enabled,
  text,
  subText,
  opacity = 0.04,
  fontSizePt = 60,
  className = '',
}) => {
  if (!enabled || !text.trim()) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden print:overflow-hidden ${className}`}
      style={{
        opacity,
      }}
      aria-hidden="true"
    >
      <div
        className="transform -rotate-45 text-center px-4 w-full"
        style={{
          transformOrigin: 'center center',
        }}
      >
        <div
          className="font-black tracking-widest text-black leading-none break-words"
          style={{
            fontSize: `${fontSizePt}pt`,
            fontFamily: "'Vazirmatn', 'Shabnam', Tahoma, sans-serif",
            textRendering: 'optimizeLegibility',
          }}
        >
          {text}
        </div>

        {subText && (
          <div
            className="font-bold text-black tracking-wider mt-3 font-mono"
            style={{
              fontSize: `${Math.round(fontSizePt * 0.35)}pt`,
              letterSpacing: '0.15em',
            }}
          >
            {subText}
          </div>
        )}
      </div>
    </div>
  );
};
