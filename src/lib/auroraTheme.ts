/**
 * Aurora Design Token System
 * Centralized design values for consistent aurora-themed UI
 */

// Aurora color palette
export const auroraColors = {
  backgroundStart: "#0a0f1f",
  backgroundEnd:   "#101c34",
  emeraldGlow:     "rgba(16, 207, 140, 0.12)",
  emeraldStrong:   "rgba(16, 207, 140, 0.35)",
  auroraGreen:     "#34f5c5",
  auroraBlue:      "#3a86ff",
  auroraPurple:    "#9d4edd",
  textPrimary:     "rgba(255,255,255,0.92)",
  textSecondary:   "rgba(255,255,255,0.65)",
};

// Gradients
export const auroraGradients = {
  cardGlow: `radial-gradient(circle at 50% 0%, rgba(16, 207, 140, 0.25), transparent 60%)`,
  background: `linear-gradient(to bottom, #0a0f1f, #101c34)`,
};

// Glows (used behind cards or icons)
export const auroraGlows = {
  soft:   "0 0 40px rgba(16, 207, 140, 0.15)",
  medium: "0 0 80px rgba(16, 207, 140, 0.25)",
  strong: "0 0 120px rgba(16, 207, 140, 0.35)",
};

// Spacing (consistency across views)
export const auroraSpacing = {
  section: "2.5rem",
  cardGap: "2rem",
  tight:   "0.5rem",
  normal:  "1rem",
  loose:   "2rem",
};

// Shadows
export const auroraShadows = {
  card:     "0 4px 24px rgba(0,0,0,0.35)",
  elevated: "0 8px 32px rgba(0,0,0,0.45)",
};

// Animation timing
export const auroraTiming = {
  pulse: "2500ms ease-in-out",
  glow:  "2500ms ease-in-out",
  fade:  "500ms ease-in-out",
};
