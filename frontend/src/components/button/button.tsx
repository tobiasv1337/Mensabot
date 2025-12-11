// The logic and JSX of the component
import React, { forwardRef } from 'react';
import type { ButtonProps } from './button.types';
import { StyledButton } from './button.styles';


const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'default', // Setzen Sie den Standardwert
            iconLeft,
            iconRight,
            text,
            children, // 'children' kann auch Text oder andere Elemente enthalten
            disabled,
            ...rest
        },
        ref
    ) => {
        // Priorisieren Sie 'text' vor 'children' (oder verwenden Sie nur eine Property)
        const content = text || children;

        return (
            <StyledButton
                ref={ref}
                $variant={variant} // Übergeben Sie die Property mit dem $präfix an den Styled Component
                disabled={disabled}
                {...rest}
            >
                {/* 1. Linkes Icon */}
                {iconLeft && <span className="icon-left">{iconLeft}</span>}

                {/* 2. Text/Inhalt (wird nur gerendert, wenn vorhanden) */}
                {content && <span className="button-content">{content}</span>}

                {/* 3. Rechtes Icon */}
                {iconRight && <span className="icon-right">{iconRight}</span>}
            </StyledButton>
        );
    }
);

// Fügen Sie einen display name hinzu, was für Debugging nützlich ist
Button.displayName = 'Button';

export { Button };