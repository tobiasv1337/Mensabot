// Defines the available styles/colors of the button.
import React from 'react';

// Defines the available styles/colors of the button.
// 'default' is the standard (darkmode: white, lightmode: black)
export const buttonVariants = ['default', 'darker', 'lighter'] as const;
export type ButtonVariant = typeof buttonVariants[number];

export const buttonSizes = ['hug', 'fill'] as const;
export type ButtonSize = typeof buttonSizes[number];

// Defines the props that the Button component accepts
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;

  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  text?: React.ReactNode;

  disabled?: boolean;
}