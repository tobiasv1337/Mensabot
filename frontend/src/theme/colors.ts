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

  //accent colors
  accent1Red: '#FE413C',
  accent2Pumpkin: '#FE7F34',
  accent3Yellow: '#FFBC2C',
};

export interface Theme {
  // Surface colors - semantic, context-based naming
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
  surfacePage: palette.darkenedWhite,            // Main background (lightest)
  textOnPage: palette.black,
  surfaceCard: palette.greySilver,       // Cards (darker than page)
  textOnCard: palette.black,
  surfaceInset: palette.white,  // Inputs (even darker)
  textOnInset: palette.white,
  surfaceElevated: palette.darkenedWhite, // Modals (slightly darker than page)
  textOnElevated: palette.black,
  surfaceAccent: palette.greyCharcoalBlue,
  textOnAccent: palette.white,

  accent1: palette.accent1Red,
  textOnAccent1: palette.black,
  accent2: palette.accent2Pumpkin,
  textOnAccent2: palette.black,
  accent3: palette.accent3Yellow,
  textOnAccent3: palette.black,

  textPrimary: palette.black,            // Same as textOnPage
  textSecondary: palette.greyJetBlack,   // Slightly dimmed
  textMuted: palette.greyCharcoalBlue,   // More dimmed
  textLight: palette.white,
  textDark: palette.black,
  textAccentGradient: palette.accent1Red,
};

// DARK MODE DEFINITION
export const darkTheme: Theme = {
  surfacePage: palette.greyJetBlack,     // Main background (darkest)
  textOnPage: palette.white,
  surfaceCard: palette.greyCharcoalBlue, // Cards (lighter than page)
  textOnCard: palette.white,
  surfaceInset: palette.greyShadowGrey,  // Inputs (even darker than page)
  textOnInset: palette.white,
  surfaceElevated: palette.greySilver,   // Modals (lightest)
  textOnElevated: palette.black,
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
  textMuted: palette.greyCharcoalBlue,   // More dimmed
  textLight: palette.white,
  textDark: palette.black,
  textAccentGradient: palette.accent1Red,
};

export const themes = {
    light: lightTheme,
    dark: darkTheme
};
