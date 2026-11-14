type ServiceIconProps = {
  name: "self-drive" | "van-driver" | "full-moving";
  className?: string;
};

/**
 * Simple line drawings for the three services.
 * They share one visual language: 1.8px strokes, rounded caps, no fills.
 */
export default function ServiceIcon({ name, className = "size-9" }: ServiceIconProps) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };

  if (name === "self-drive") {
    return (
      <svg {...common}>
        {/* Van with an open side door and a key inside */}
        <path d="M6 32V20.5c0-1 .8-1.8 1.8-1.8h13.4l5.4 5.6h4.2c2.9 0 5.3 1.9 6.6 4.5l1.1 2.4" />
        <path d="M6 32h3.2M17.4 32h10.8M35.7 32H39a3 3 0 0 0 3-3v-.6" />
        <circle cx="14" cy="33.5" r="2.6" />
        <circle cx="32" cy="33.5" r="2.6" />
        <path d="M25 22.4v-3.1l2.6-1.6" />
        <circle cx="27.6" cy="18.8" r="1.6" />
      </svg>
    );
  }

  if (name === "van-driver") {
    return (
      <svg {...common}>
        {/* Driver behind the wheel, van facing right */}
        <path d="M7 30V21c0-1.2 1-2.2 2.2-2.2h10.6l4.6 4.8h5.1c2.5 0 4.6 1.7 5.5 4l.9 2.4" />
        <path d="M7 30h2.6M17.6 30h10.2M36 30h3.2A2.9 2.9 0 0 0 42 27v-.4" />
        <circle cx="14.6" cy="31.6" r="2.6" />
        <circle cx="31.4" cy="31.6" r="2.6" />
        <circle cx="14" cy="26.2" r="2.2" />
        <path d="M10.4 32.8c.7-2 2-3 3.6-3s2.9 1 3.6 3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      {/* Stacked boxes with a moving strap and an up arrow */}
      <path d="M8 24h13v10H8z" />
      <path d="M21 19h18v15H21z" />
      <path d="M8 24l4.5-4.5H17L21 24" />
      <path d="M21 19l4.5-4.5H35L39 19" />
      <path d="M28.5 15v19M14.5 24v10" />
      <path d="M27 9.5v-4m0 0-2 2m2-2 2 2" />
    </svg>
  );
}
