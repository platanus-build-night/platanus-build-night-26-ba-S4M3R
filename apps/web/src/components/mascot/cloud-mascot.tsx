"use client";

import { useId } from "react";
import { motion } from "framer-motion";

const BLUE = "#3B82F6";
const BLUE_LIGHT = "#60A5FA";
const BLUE_DARK = "#2563EB";
const CYAN_GLOW = "#67E8F9";

interface CloudMascotProps {
  size?: number;
  className?: string;
  /** Disable the idle floating bob animation */
  disableFloat?: boolean;
}

export function CloudMascot({ size = 400, className = "", disableFloat = false }: CloudMascotProps) {
  const uid = useId().replace(/:/g, "");
  const height = Math.round(size * (450 / 400));

  const ref = (name: string) => `${name}_${uid}`;
  const url = (name: string) => `url(#${ref(name)})`;

  return (
      <motion.svg
        viewBox="0 0 400 450"
        width={size}
        height={height}
        className={className}
        {...(!disableFloat && {
          initial: { y: 0 },
          animate: { y: [0, -8, 0] },
          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        })}
      >
        <defs>
          <radialGradient id={ref("bodyGrad")} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={BLUE_LIGHT} />
            <stop offset="60%" stopColor={BLUE} />
            <stop offset="100%" stopColor={BLUE_DARK} />
          </radialGradient>

          <radialGradient id={ref("rimLight")} cx="30%" cy="20%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <radialGradient id={ref("eyeGrad")} cx="45%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          <radialGradient id={ref("shadow")} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          <linearGradient id={ref("bodyHighlight")} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <radialGradient id={ref("pupilGrad")} cx="40%" cy="35%" r="50%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          <filter id={ref("softGlow")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={ref("strongGlow")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shadow on ground */}
        <motion.ellipse
          cx="200"
          cy="420"
          rx="80"
          ry="12"
          fill={url("shadow")}
          animate={{ rx: [80, 75, 80], opacity: [0.5, 0.35, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Left leg */}
        <ellipse cx="170" cy="345" rx="18" ry="28" fill={BLUE_DARK} />
        <ellipse cx="170" cy="345" rx="18" ry="28" fill={url("rimLight")} />
        <ellipse cx="168" cy="368" rx="22" ry="12" fill={BLUE_DARK} />

        {/* Right leg */}
        <ellipse cx="230" cy="345" rx="18" ry="28" fill={BLUE_DARK} />
        <ellipse cx="230" cy="345" rx="18" ry="28" fill={url("rimLight")} />
        <ellipse cx="232" cy="368" rx="22" ry="12" fill={BLUE_DARK} />

        {/* Left arm */}
        <motion.g
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "115px 240px" }}
        >
          <ellipse cx="105" cy="255" rx="20" ry="28" fill={BLUE_DARK} />
          <ellipse cx="105" cy="255" rx="20" ry="28" fill={url("rimLight")} />
        </motion.g>

        {/* Right arm */}
        <motion.g
          animate={{ rotate: [3, -3, 3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "285px 240px" }}
        >
          <ellipse cx="295" cy="255" rx="20" ry="28" fill={BLUE_DARK} />
          <ellipse cx="295" cy="255" rx="20" ry="28" fill={url("rimLight")} />
        </motion.g>

        {/* Main cloud body */}
        <g>
          <ellipse cx="200" cy="240" rx="110" ry="105" fill={url("bodyGrad")} />
          <ellipse cx="155" cy="170" rx="55" ry="50" fill={url("bodyGrad")} />
          <ellipse cx="245" cy="175" rx="48" ry="45" fill={url("bodyGrad")} />
          <ellipse cx="200" cy="155" rx="45" ry="42" fill={url("bodyGrad")} />
          <ellipse cx="120" cy="220" rx="42" ry="50" fill={url("bodyGrad")} />
          <ellipse cx="280" cy="225" rx="40" ry="48" fill={url("bodyGrad")} />
          <ellipse cx="200" cy="300" rx="95" ry="50" fill={url("bodyGrad")} />

          <ellipse cx="200" cy="240" rx="110" ry="105" fill={url("bodyHighlight")} />
          <ellipse cx="155" cy="170" rx="55" ry="50" fill={url("bodyHighlight")} />
          <ellipse cx="245" cy="175" rx="48" ry="45" fill={url("bodyHighlight")} />
          <ellipse cx="200" cy="155" rx="45" ry="42" fill={url("bodyHighlight")} />
          <ellipse cx="200" cy="240" rx="110" ry="105" fill={url("rimLight")} />
        </g>

        {/* Antenna bumps */}
        <ellipse cx="175" cy="128" rx="12" ry="16" fill={BLUE} />
        <ellipse cx="175" cy="128" rx="12" ry="16" fill={url("bodyHighlight")} />
        <ellipse cx="175" cy="120" rx="8" ry="8" fill={BLUE_LIGHT} opacity="0.6" />
        <ellipse cx="225" cy="132" rx="10" ry="14" fill={BLUE} />
        <ellipse cx="225" cy="132" rx="10" ry="14" fill={url("bodyHighlight")} />
        <ellipse cx="225" cy="125" rx="7" ry="7" fill={BLUE_LIGHT} opacity="0.6" />

        {/* Eyes */}
        <g>
          <ellipse cx="170" cy="228" rx="30" ry="28" fill={CYAN_GLOW} opacity="0.08" filter={url("strongGlow")} />
          <ellipse cx="170" cy="228" rx="24" ry="26" fill={url("eyeGrad")} />
          <motion.ellipse
            cx="172" cy="226" rx="12" ry="14"
            fill={url("pupilGrad")}
            animate={{ cx: [172, 174, 172, 170, 172] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <ellipse cx="163" cy="218" rx="6" ry="7" fill="white" opacity="0.85" />
          <ellipse cx="176" cy="234" rx="3" ry="3.5" fill="white" opacity="0.4" />
          <ellipse cx="170" cy="228" rx="24" ry="26" fill="none" stroke={CYAN_GLOW} strokeWidth="1.5" opacity="0.3" filter={url("softGlow")} />

          <ellipse cx="230" cy="228" rx="30" ry="28" fill={CYAN_GLOW} opacity="0.08" filter={url("strongGlow")} />
          <ellipse cx="230" cy="228" rx="24" ry="26" fill={url("eyeGrad")} />
          <motion.ellipse
            cx="232" cy="226" rx="12" ry="14"
            fill={url("pupilGrad")}
            animate={{ cx: [232, 234, 232, 230, 232] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <ellipse cx="223" cy="218" rx="6" ry="7" fill="white" opacity="0.85" />
          <ellipse cx="236" cy="234" rx="3" ry="3.5" fill="white" opacity="0.4" />
          <ellipse cx="230" cy="228" rx="24" ry="26" fill="none" stroke={CYAN_GLOW} strokeWidth="1.5" opacity="0.3" filter={url("softGlow")} />
        </g>

        {/* Mouth */}
        <path d="M 188 262 Q 200 274 212 262" fill="none" stroke={BLUE_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

        {/* Cheek blush */}
        <ellipse cx="145" cy="248" rx="14" ry="8" fill={BLUE_LIGHT} opacity="0.15" />
        <ellipse cx="255" cy="248" rx="14" ry="8" fill={BLUE_LIGHT} opacity="0.15" />

        {/* Specular highlight */}
        <ellipse cx="185" cy="165" rx="30" ry="12" fill="white" opacity="0.08" />
      </motion.svg>
  );
}
