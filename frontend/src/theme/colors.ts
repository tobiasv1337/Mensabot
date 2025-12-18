// complete color palette
const palette = {
  // background and text colors
  black: '#1F1F1F',
  greyShadowGrey: '#212529',
  greyJetBlack: '#2A2E32',
  greyCharcoalBlue: '#3D434B',
  greySilver: '#CBCCCD',
  white: '#F1F1F1',

  //accent colors
  accent1Red: '#FE413C',
  accent2Pumpkin: '#FE7F34',
  accent3Yellow: '#FFBC2C',
};

export interface Theme{
  // Background colors (static)
  backgroundPrimary: string;
  backgroundDarker: string;
  backgroundLighter1: string;
  backgroundLighter2: string;
  backgroundAccent: string;
  
  // Dynamic colors (mode-dependent)
  textPrimary: string;
  textSecondary: string;
  textContrast: string;        // Text color for contrast elements
  textAccentGradient: string;          // ToDo: Gradient text color for mainPageTitle

  accent1: string;
  accent2: string;
  accent3: string;
}

// LIGHT MODE DEFINITION
export const lightTheme: Theme= {
  backgroundPrimary: palette.greySilver,
  backgroundDarker: palette.greyShadowGrey,
  backgroundLighter1: palette.white,
  backgroundLighter2: palette.white, //TODO: add color between white and greySilver
  backgroundAccent: palette.greyCharcoalBlue,

  textPrimary: palette.black,
  textSecondary: palette.greyJetBlack,
  textContrast: palette.white,
  textAccentGradient: palette.accent1Red,
  
  accent1: palette.accent1Red,
  accent2: palette.accent2Pumpkin,
  accent3: palette.accent3Yellow,
};

// DARK MODE DEFINITION
export const darkTheme: Theme = {
  backgroundPrimary: palette.greyJetBlack, // switched greyShadowGrey and greyJetBlack
  backgroundDarker: palette.greyCharcoalBlue,
  backgroundLighter1: palette.greyShadowGrey, // switched greyShadowGrey and greyJetBlack
  backgroundLighter2: palette.greySilver,
  backgroundAccent: palette.white,

  textPrimary: palette.white,
  textSecondary: palette.greySilver,
  textContrast: palette.black,
  textAccentGradient: palette.accent1Red,
  
  accent1: palette.accent1Red,
  accent2: palette.accent2Pumpkin,
  accent3: palette.accent3Yellow,
};

export const themes = {
    light: lightTheme,
    dark: darkTheme
};