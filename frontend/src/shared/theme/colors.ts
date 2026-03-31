// complete color palette
const palette = {
  // background and text colors
  black: '#1F1F1F',
  greyShadowGrey: '#212529',
  greyJetBlack: '#2A2E32',
  greyCharcoalBlue: '#3D434B',
  greySilver: '#CBCCCD',
  darkenedWhite: '#EBEBEB',
  white: '#F1F1F1',
  cleanOffWhite: '#F9FAFB',
  pureWhite: '#FFFFFF',
  lightGrey: '#F3F4F6',
  deepGreyBlack: '#111827',
  mutedGrey: '#4B5563',
  lighterGrey: '#9CA3AF',

  //accent colors
  accent1Red: '#FE413C',
  accent2Pumpkin: '#FE7F34',
  accent3Yellow: '#FFBC2C',
};

export interface Theme {
  // Surface colors - semantic, context-based naming
  mode: 'light' | 'dark'; // Explicit mode flag
  surfacePage: string;           // Main page background
  textOnPage: string;            // Text color for surfacePage
  surfaceCard: string;           // Cards, panels (raised surfaces)
  textOnCard: string;            // Text color for surfaceCard
  surfaceInset: string;          // Inputs, wells (recessed areas)
  textOnInset: string;           // Text color for surfaceInset
  surfaceElevated: string;       // Modals, dropdowns (highest elevation)
  textOnElevated: string;        // Text color for surfaceElevated
  surfaceAccent: string;         // Accent surface
  textOnAccent: string;          // Text color for surfaceAccent

  // Accent colors with text pairings
  accent1: string;               // Primary accent color
  textOnAccent1: string;         // Text color for accent1 background
  accent2: string;               // Secondary accent color
  textOnAccent2: string;         // Text color for accent2 background
  accent3: string;               // Tertiary accent color
  textOnAccent3: string;         // Text color for accent3 background

  // Generic text colors (convenience aliases)
  textPrimary: string;           // Primary text (= textOnPage)
  textSecondary: string;         // Dimmed text for less important content
  textMuted: string;             // Even more dimmed text
  textLight: string;             // Light text color (for demos/utilities)
  textDark: string;              // Dark text color (for demos/utilities)
  textAccentGradient: string;    // Special accent color for gradient text
}

// LIGHT MODE DEFINITION
export const lightTheme: Theme = {
  mode: 'light',
  surfacePage: palette.cleanOffWhite,            // Main background
  textOnPage: palette.black,
  surfaceCard: palette.pureWhite,                // Cards (raised/elevated surfaces)
  textOnCard: palette.black,
  surfaceInset: palette.lightGrey,               // Inputs, wells (recessed areas)
  textOnInset: palette.black,
  surfaceElevated: palette.pureWhite,            // Modals, dropdowns (highest elevation)
  textOnElevated: palette.black,
  surfaceAccent: palette.greyCharcoalBlue,
  textOnAccent: palette.white,

  accent1: palette.accent1Red,
  textOnAccent1: palette.white,                  // Better contrast on red
  accent2: palette.accent2Pumpkin,
  textOnAccent2: palette.white,                  // Better contrast on pumpkin
  accent3: palette.accent3Yellow,
  textOnAccent3: palette.black,

  textPrimary: palette.deepGreyBlack,            // Deep grey/black for primary text
  textSecondary: palette.mutedGrey,              // Muted grey for secondary
  textMuted: palette.lighterGrey,                // Lighter grey for muted
  textLight: palette.white,
  textDark: palette.black,
  textAccentGradient: palette.accent1Red,
};

// DARK MODE DEFINITION
export const darkTheme: Theme = {
  mode: 'dark',
  surfacePage: palette.greyJetBlack,             // Main background
  textOnPage: palette.white,
  surfaceCard: palette.greyCharcoalBlue,         // Cards (raised/elevated surfaces)
  textOnCard: palette.white,
  surfaceInset: palette.greyShadowGrey,          // Inputs, wells (recessed areas)
  textOnInset: palette.white,
  surfaceElevated: palette.greyCharcoalBlue,     // Modals, dropdowns (highest elevation)
  textOnElevated: palette.white,
  surfaceAccent: palette.white,
  textOnAccent: palette.black,

  accent1: palette.accent1Red,
  textOnAccent1: palette.black,
  accent2: palette.accent2Pumpkin,
  textOnAccent2: palette.black,
  accent3: palette.accent3Yellow,
  textOnAccent3: palette.black,

  textPrimary: palette.white,            // Same as textOnPage
  textSecondary: palette.greySilver,     // Slightly dimmed
  textMuted: palette.greySilver,         // More dimmed
  textLight: palette.white,
  textDark: palette.black,
  textAccentGradient: palette.accent1Red,
};

export const themes = {
  light: lightTheme,
  dark: darkTheme
};
