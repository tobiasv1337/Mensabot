// The logic and JSX of the component
import { forwardRef } from 'react';
import type { ButtonProps } from './button.types';
import { StyledButton } from './button.styles';


const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'default',
            size = 'hug',
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
                $size={size}
                disabled={disabled}
                {...rest}
            >
                {/* only renderes if there */}
                {iconLeft && <span className="icon-left">{iconLeft}</span>}
                {content && <span className="button-content">{content}</span>}
                {iconRight && <span className="icon-right">{iconRight}</span>}
            </StyledButton>
        );
    }
);

Button.displayName = 'Button';

export { Button };