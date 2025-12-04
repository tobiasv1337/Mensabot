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

interface Theme{
  // Background colors (static)
  backgroundPrimary: string;
  backgroundPrimaryOff: string;
  backgroundWidget: string;
  backgroundWidgetOff: string;
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
  backgroundPrimaryOff: palette.greyShadowGrey,
  backgroundWidget: palette.white,
  backgroundWidgetOff: palette.greyJetBlack,
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
  backgroundPrimary: palette.greyShadowGrey,
  backgroundPrimaryOff: palette.greyCharcoalBlue,
  backgroundWidget: palette.greyJetBlack,
  backgroundWidgetOff: palette.greySilver,
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