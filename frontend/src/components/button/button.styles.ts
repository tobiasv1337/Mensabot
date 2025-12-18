// The styled components for the Button component
import type { Theme } from "../../theme/colors.ts";
import type { ButtonProps } from "./button.types.ts";
import styled, { css } from 'styled-components';

interface StyledButtonProps {
    theme: Theme;
    $variant: ButtonProps['variant'];
    $size: ButtonProps['size'];
}


const getVariantStyles = (currentTheme: Theme, variant: ButtonProps['variant'] = 'default') => {
// Define color schemes for different button variants
    const variantStyles = {
        default: { // dark or light background color -> neutral/invisible button
            background: currentTheme.backgroundPrimary,
            color: currentTheme.textPrimary,
        }, 
        darker: { // darker as background color
            background: currentTheme.backgroundDarker,
            color: currentTheme.textPrimary,
        },
        lighter: { // lighter as background color
            background: currentTheme.backgroundLighter1,
            color: currentTheme.textPrimary,
        },
    }
    return variantStyles[variant];
};

const getSizeStyles = (size: ButtonProps['size'] = 'hug') => {
    const sizeStyles = {
        hug: css`
            width: fit-content;
            height: fit-content;
            padding: 5px 5px;
        `,
        fill: css`
            width: 100%;
            height: fit-content;
            padding: 5px 0;
        `,
    };
    return sizeStyles[size];
};

export const StyledButton = styled.button<StyledButtonProps & ButtonProps>`
    // Anwendung der Variant-Styles
    ${({ theme, $variant }) => {
        const styles = getVariantStyles(theme, $variant);
        return css`
            background: ${styles.background};
            color: ${styles.color};

            &:hover:not(:disabled) {
                filter: brightness(0.9);
            }
        `;
    }}

    // Anwendung der Size-Styles
    ${({ $size }) => getSizeStyles($size)}
`;


export { getVariantStyles, getSizeStyles };
export type { StyledButtonProps };
