import React from "react";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  /** Deterministic seed for the fallback colour (e.g. user id). Defaults to hashing the name. */
  seed?: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function seedToHue(seed: number): number {
  return (seed * 53) % 360;
}

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  seed,
  size = 36,
  className = "",
  style = {},
  title,
}) => {
  const hue = seed !== undefined ? seedToHue(seed) : nameToHue(name);
  const initials = getInitials(name || "?");

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size * 0.36,
    fontWeight: 700,
    fontFamily: "Inter, sans-serif",
    background: avatarUrl ? "transparent" : `hsl(${hue}, 60%, 45%)`,
    color: "#fff",
    userSelect: "none",
    ...style,
  };

  return (
    <div
      className={`avatar ${className}`}
      style={baseStyle}
      title={title ?? name}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            // If image fails to load, hide it so initials show through
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
