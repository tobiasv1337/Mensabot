// The styled components for the Button component
import type { Theme } from "../../theme/colors.ts";
import type { ButtonProps } from "./button.types.ts";
import styled, { css } from 'styled-components';

interface StyledButtonProps {
    theme: Theme;
    $variant: ButtonProps['variant'];
    $size: ButtonProps['size'];
    $active?: boolean;
}


const getVariantStyles = (theme: Theme, variant: ButtonProps['variant'] = 'default') => {
    // Define color schemes for different button variants
    const variantStyles = {
        default: { // neutral button with surface colors
            bg: 'transparent',
            color: theme.textSecondary,
            hoverBg: theme.surfaceInset,
            hoverColor: theme.textPrimary,
        }, 
        surfaceAccent: { // darker surface background
            bg: theme.surfaceAccent,
            color: theme.textOnAccent,
            hoverBg: theme.surfaceAccent,
            hoverColor: theme.textOnAccent,
        },
        surfaceInset: { // lighter surface background
            bg: theme.surfaceInset,
            color: theme.textOnInset,
            hoverBg: theme.surfaceInset,
            hoverColor: theme.textOnInset,
        },
        iconOnly: { // for icon-only buttons
            bg: 'transparent',
            color: theme.textSecondary,
            hoverBg: theme.surfaceInset,
            hoverColor: theme.textPrimary,
        },
    };
    return variantStyles[variant ?? 'default'];
};

const getSizeStyles = (size: ButtonProps['size'] = 'hug') => {
    const sizeStyles = {
        hug: css`
            width: fit-content;
            height: fit-content;
            padding: 10px 14px;
            font-size: 15px;
        `,
        fill: css`
            width: 100%;
            height: 44px;
            padding: 0 12px;
            justify-content: flex-start;
            font-weight: 500;
            box-sizing: border-box;
        `,
        iconOnly: css`
            width: 20px;
            height: 20px;
            padding: 20px;
            margin: 20px;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            img {
                width: 20px;
                height: 20px;
            }
        `,
    };
    return sizeStyles[size ?? 'fill'];
};

// Icon wrapper for fill size buttons
export const ButtonIconWrapper = styled.span`
  width: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: inherit;
  
  img {
    width: 20px;
    height: 20px;
    filter: brightness(0) saturate(100%) invert(1);
  }
`;

// Text wrapper for fill size buttons
export const ButtonTextWrapper = styled.span<{ collapsed?: boolean }>`
  white-space: nowrap;
  ${({ collapsed }) =>
    collapsed &&
    `
    display: none;
  `}
`;

export const StyledButton = styled.button<StyledButtonProps & ButtonProps>`
    all: unset;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-items: center;
    line-height: 1.2;
    gap: 6px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s ease;
    
    // application Variant-Styles
    ${({ theme, $variant, $active }) => {
        const variant = $active ? 'surfaceAccent' : $variant;
        const styles = getVariantStyles(theme, variant);
        return css`
            background: ${styles.bg};
            color: ${styles.color};

            &:hover:not(:disabled) {
                background: ${styles.hoverBg};
                color: ${styles.hoverColor};
                filter: brightness(0.85);
            }
            
            &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
    }}

    // application Size-Styles
    ${({ $size }) => getSizeStyles($size)}
`;

StyledButton.defaultProps = {
    $variant: 'default',
    $size: 'hug',
};


export { getVariantStyles, getSizeStyles };
export type { StyledButtonProps };
