// Defines the available styles/colors of the button.
import React from 'react';

// Defines the available styles/colors of the button.
// 'default' is the standard (darkmode: white, lightmode: black), 'primary' is the main accent (red), etc.
export const buttonVariants = ['default', 'primary', 'secondary'] as const;
export type ButtonVariant = typeof buttonVariants[number];


// Defines the props that the Button component accepts
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;

  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  text?: React.ReactNode;

  disabled?: boolean;
}