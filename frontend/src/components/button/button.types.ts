// Defines the available styles/colors of the button.
import React from 'react';

// Defines the available styles/colors of the button.
// 'default' is the standard (neutral with transparent background)
export const buttonVariants = ['default', 'surfaceAccent', 'surfaceInset', 'iconOnly'] as const;
export type ButtonVariant = typeof buttonVariants[number];

export const buttonSizes = ['hug', 'fill', 'iconOnly'] as const;
export type ButtonSize = typeof buttonSizes[number];

// Defines the props that the Button component accepts
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  collapsed?: boolean;

  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  text?: React.ReactNode;

  disabled?: boolean;
}