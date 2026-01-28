// The styled components for the Button component
import type { Theme } from "../../theme/colors.ts";
import type { ButtonProps } from "./button.types.ts";
import styled, { css } from 'styled-components';

interface StyledButtonProps {
    theme: Theme;
    $variant: ButtonProps['variant'];
    $size: ButtonProps['size'];
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
        darker: { // darker surface background
            bg: theme.surfaceAccent,
            color: theme.textOnAccent,
            hoverBg: theme.surfaceAccent,
            hoverColor: theme.textOnAccent,
        },
        lighter: { // lighter surface background
            bg: theme.surfaceInset,
            color: theme.textOnInset,
            hoverBg: theme.surfaceInset,
            hoverColor: theme.textOnInset,
        },
    }
    return variantStyles[variant ?? 'default'];
};

const getSizeStyles = (size: ButtonProps['size'] = 'hug') => {
    const sizeStyles = {
        hug: css`
            width: fit-content;
            height: fit-content;
            padding: 5px 5px;
        `,
        fill: css`
            width: calc(100% - 16px);
            height: 44px;
            padding: 0 12px;
            justify-content: flex-start;
            font-weight: 500;
            margin: 0 8px;
        `,
    };
    return sizeStyles[size ?? 'fill'];
};

// Icon wrapper for fill size buttons
export const ButtonIconWrapper = styled.span`
  width: 44px;
  display: flex;
  justify-content: center;
  font-size: 20px;
`;

// Text wrapper for fill size buttons
export const ButtonTextWrapper = styled.span`
  white-space: nowrap;
  margin-left: 6px;
`;

export const StyledButton = styled.button<StyledButtonProps & ButtonProps>`
    all: unset;
    display: flex;
    align-items: center;
    line-height: 1.2;
    gap: 10px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s ease;
    
    // application Variant-Styles
    ${({ theme, $variant }) => {
        const styles = getVariantStyles(theme, $variant);
        return css`
            background: ${styles.bg};
            color: ${styles.color};

            &:hover:not(:disabled) {
                background: ${styles.hoverBg};
                color: ${styles.hoverColor};
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
