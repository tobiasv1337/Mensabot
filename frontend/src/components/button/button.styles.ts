// The styled components for the Button component
import type { Theme } from "../../theme/colors.ts";
import type { ButtonProps } from "./button.types.ts";
import styled, { css } from 'styled-components';

interface StyledButtonProps {
    theme: Theme;
    $variant: ButtonProps['variant'];
}


const getVariantStyles = (currentTheme: Theme, variant: ButtonProps['variant'] = 'default') => {
// Define color schemes for different button variants
    const variantStyles = {
        default: {
            background: currentTheme.backgroundPrimary,
            color: currentTheme.textPrimary,
            border: `1px solid ${currentTheme.backgroundPrimary}`,
        }, 
        primary: {
            background: currentTheme.accent1,
            color: currentTheme.textPrimary,
            border: `1px solid ${currentTheme.accent1}`,
        },
        secondary: {
            background: currentTheme.backgroundWidget,
            color: currentTheme.textPrimary,
            border: `1px solid ${currentTheme.backgroundWidget}`,
        },
    }
    return variantStyles[variant];
};

export const StyledButton = styled.button<StyledButtonProps & ButtonProps>`
    // Anwendung der Variant-Styles
    ${({ theme, $variant }) => {
        const styles = getVariantStyles(theme, $variant);
        return css`
            background: ${styles.background};
            color: ${styles.color};
            border: ${styles.border};

            &:hover:not(:disabled) {
                // Beispiel: Leichte Verdunkelung/Aufhellung beim Hover
                filter: brightness(1.1);
            }
        `;
    }}
`;


export { getVariantStyles };
export type { StyledButtonProps };
