// The logic and JSX of the component
import { forwardRef } from 'react';
import type { ButtonProps } from './button.types';
import { StyledButton, ButtonTextWrapper } from './button.styles';


const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'default',
            size = 'hug',
            active = false,
            collapsed = false,
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
                $active={active}
                disabled={disabled}
                {...rest}
            >
                {/* only renders if there */}
                {iconLeft && <span className="icon-left">{iconLeft}</span>}
                {children ? children : <ButtonTextWrapper collapsed={collapsed}>{content}</ButtonTextWrapper>}
                {iconRight && <span className="icon-right">{iconRight}</span>}
            </StyledButton>
        );
    }
);

Button.displayName = 'Button';

export { Button };