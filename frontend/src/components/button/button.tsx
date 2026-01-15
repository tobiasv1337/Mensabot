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
            children,
            disabled,
            ...rest
        },
        ref
    ) => {
        const content = text || children;

        return (
            <StyledButton
                ref={ref}
                $variant={variant}
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