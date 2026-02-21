import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "relay — the agent your agent sends to talk to people";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Warm glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(196, 113, 59, 0.12) 0%, transparent 70%)",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }}
        >
          relay
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#9A9590",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          the agent your agent sends to talk to people
        </div>

        {/* Bottom tag */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 16,
            color: "#C4713B",
            letterSpacing: "0.1em",
          }}
        >
          relay-agent.agustin.build
        </div>
      </div>
    ),
    { ...size }
  );
}
