import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useGetPublicCard, getGetPublicCardQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

const ICON_PACKS: Record<string, string[]> = {
  tech: ["💻", "📷", "🔋", "⌚", "📺", "🚚", "⚡", "🖥️", "📱", "🔌", "🖨️", "📡"],
  "real-estate": ["🏠", "🔑", "🏢", "📐", "📍", "🏗️", "🏡", "🗺️", "🏘️", "📋"],
  creative: ["✏️", "🖌️", "🎨", "📐", "🖥️", "📸", "🎭", "✒️", "🖍️", "🎬"],
  medical: ["❤️", "🩺", "💊", "📋", "➕", "🏥", "💉", "🧬", "🩻", "🔬"],
};

const FONT_FAMILIES: Record<string, string> = {
  outfit: "'Outfit', sans-serif",
  playfair: "'Playfair Display', serif",
  inter: "'Inter', sans-serif",
};

const LINK_TYPE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Call",
  sms: "SMS",
  email: "Email",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X (Twitter)",
  youtube: "YouTube",
  github: "GitHub",
  custom: "Link",
};

interface ScatterCanvasProps {
  iconPack: string;
  density: number;
  opacity: number;
}

function ScatterCanvas({ iconPack, density, opacity }: ScatterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";

    const icons = ICON_PACKS[iconPack] || ICON_PACKS.tech;
    const count = Math.floor(icons.length * density * 2.5);
    const placed: { x: number; y: number }[] = [];

    let attempts = 0;
    while (placed.length < count && attempts < count * 20) {
      attempts++;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const collision = placed.some((p) => Math.hypot(p.x - x, p.y - y) < 8);
      if (!collision) {
        placed.push({ x, y });
        const span = document.createElement("span");
        span.textContent = icons[Math.floor(Math.random() * icons.length)];
        span.style.cssText = `
          position: absolute;
          left: ${x}%;
          top: ${y}%;
          font-size: ${1.2 + Math.random() * 0.8}rem;
          opacity: ${opacity};
          transform: rotate(${Math.random() * 60 - 30}deg);
          pointer-events: none;
          user-select: none;
        `;
        el.appendChild(span);
      }
    }
  }, [iconPack, density, opacity]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
}

interface CardLink {
  type: string;
  label?: string | null;
  url: string;
  icon?: string | null;
  sortOrder?: number;
}

interface CardDisplayProps {
  card: {
    fullName: string;
    professionalTitle?: string | null;
    brandName?: string | null;
    brandSubtitle?: string | null;
    location?: string | null;
    showStatusDot: boolean;
    bio?: string | null;
    profileImageUrl?: string | null;
    accentColor: string;
    textColor: string;
    bgColor: string;
    fontStyle: string;
    bgIconPack: string;
    bgIconDensity: number;
    bgIconOpacity: number;
    links: CardLink[];
  };
  preview?: boolean;
}

export function CardDisplay({ card, preview = false }: CardDisplayProps) {
  const initials = card.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sortedLinks = [...(card.links || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const fontFamily = FONT_FAMILIES[card.fontStyle] || FONT_FAMILIES.outfit;

  return (
    <div
      data-testid="card-display"
      style={
        {
          "--accent": card.accentColor,
          "--ink": card.textColor,
          "--bg": card.bgColor,
          backgroundColor: card.bgColor,
          color: card.textColor,
          fontFamily,
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: preview ? "auto" : "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        } as React.CSSProperties
      }
    >
      {!preview && (
        <ScatterCanvas
          iconPack={card.bgIconPack}
          density={card.bgIconDensity}
          opacity={card.bgIconOpacity}
        />
      )}

      <div
        style={{
          maxWidth: 380,
          width: preview ? "100%" : "92vw",
          padding: preview ? "2rem 1.5rem" : "2.5rem 2rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand header */}
        {card.brandName && (
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "lowercase",
              opacity: 0.45,
              marginBottom: "1.75rem",
            }}
          >
            {card.brandName}
            {card.brandSubtitle && (
              <span style={{ marginLeft: "0.5rem" }}>· {card.brandSubtitle}</span>
            )}
          </div>
        )}

        {/* Logo ring */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: `2px solid ${card.accentColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
            animation: "ringPulse 2.8s ease-in-out infinite",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {card.profileImageUrl ? (
            <img
              src={card.profileImageUrl}
              alt={card.fullName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                fontSize: "1.35rem",
                fontWeight: 600,
                color: card.accentColor,
                fontFamily,
              }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Name */}
        <h1
          style={{
            fontSize: preview ? "1.5rem" : "1.75rem",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "0.2rem",
            color: card.textColor,
          }}
        >
          {card.fullName}
        </h1>

        {/* Title */}
        {card.professionalTitle && (
          <p
            style={{
              fontSize: "0.85rem",
              opacity: 0.55,
              marginBottom: "0.4rem",
              color: card.textColor,
            }}
          >
            {card.professionalTitle}
          </p>
        )}

        {/* Location */}
        {card.location && (
          <p
            style={{
              fontSize: "0.78rem",
              opacity: 0.42,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              marginBottom: "1.5rem",
              color: card.textColor,
            }}
          >
            {card.showStatusDot && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: card.accentColor,
                  display: "inline-block",
                  flexShrink: 0,
                  animation: "statusPulse 2s ease-in-out infinite",
                }}
              />
            )}
            {card.location}
          </p>
        )}

        {/* Bio */}
        {card.bio && (
          <p
            style={{
              fontSize: "0.83rem",
              fontStyle: "italic",
              opacity: 0.62,
              marginBottom: "1.75rem",
              lineHeight: 1.65,
              color: card.textColor,
            }}
          >
            {card.bio}
          </p>
        )}

        {/* Action links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {sortedLinks.map((link, i) => (
            <ActionLink
              key={i}
              link={link}
              index={i}
              accentColor={card.accentColor}
              textColor={card.textColor}
              preview={preview}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 0 6px color-mix(in srgb, ${card.accentColor} 18%, transparent); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes btnIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

interface ActionLinkProps {
  link: CardLink;
  index: number;
  accentColor: string;
  textColor: string;
  preview?: boolean;
}

function ActionLink({ link, index, accentColor, textColor, preview }: ActionLinkProps) {
  const label = link.label || LINK_TYPE_LABELS[link.type] || link.type;
  const icon = getLinkIcon(link.type);

  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.85rem 1.25rem",
    border: `1px solid color-mix(in srgb, ${textColor} 12%, transparent)`,
    borderRadius: "0.5rem",
    textDecoration: "none",
    color: textColor,
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "padding-left 0.22s ease, border-color 0.22s ease",
    animation: preview ? "none" : `btnIn 0.4s ease forwards`,
    animationDelay: preview ? "0ms" : `${index * 60}ms`,
    opacity: preview ? 1 : 0,
    background: "transparent",
  };

  return (
    <a
      href={preview ? undefined : link.url}
      target={preview ? undefined : "_blank"}
      rel="noopener noreferrer"
      data-testid={`link-${link.type}-${index}`}
      style={style}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.paddingLeft = "1.5rem";
        el.style.borderColor = accentColor;
        const chevron = el.querySelector(".chevron") as HTMLElement;
        if (chevron) chevron.style.transform = "translateX(3px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.paddingLeft = "1.25rem";
        el.style.borderColor = `color-mix(in srgb, ${textColor} 12%, transparent)`;
        const chevron = el.querySelector(".chevron") as HTMLElement;
        if (chevron) chevron.style.transform = "translateX(0)";
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ opacity: 0.6 }}>{icon}</span>
        {label}
      </span>
      <span
        className="chevron"
        style={{
          color: accentColor,
          transition: "transform 0.22s ease",
          fontSize: "1.1rem",
          lineHeight: 1,
        }}
      >
        ›
      </span>
    </a>
  );
}

function getLinkIcon(type: string): string {
  const icons: Record<string, string> = {
    whatsapp: "💬",
    phone: "📞",
    sms: "💬",
    email: "✉️",
    linkedin: "in",
    facebook: "f",
    instagram: "ig",
    twitter: "𝕏",
    youtube: "▶",
    github: "◉",
    custom: "↗",
  };
  return icons[type] || "↗";
}

export default function PublicCard() {
  const params = useParams<{ username: string }>();
  const username = params.username || "";

  const { data: card, isLoading, isError } = useGetPublicCard(username, {
    query: { queryKey: getGetPublicCardQueryKey(username), enabled: !!username },
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-[380px] max-w-[92vw] space-y-4 p-8">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !card) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-3">
        <p className="text-2xl font-semibold">Card not found</p>
        <p className="text-muted-foreground text-sm">
          The card at <strong>/{username}</strong> doesn't exist or isn't published.
        </p>
      </div>
    );
  }

  return <CardDisplay card={{ ...card, links: (card.links as CardLink[]) || [] }} />;
}
