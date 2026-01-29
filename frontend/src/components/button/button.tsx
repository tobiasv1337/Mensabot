// The logic and JSX of the component
import React, { forwardRef } from 'react';
import type { ButtonProps } from './button.types';
import { StyledButton, ButtonTextWrapper, ButtonIconWrapper } from './button.styles';


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
                {/* left icon */}
                {iconLeft && (
                    React.isValidElement(iconLeft) && (iconLeft as any).type === 'img' ? (
                        <ButtonIconWrapper>
                            <img src={(iconLeft as any).props.src} alt={(iconLeft as any).props.alt || ''} />
                        </ButtonIconWrapper>
                    ) : (
                        <ButtonIconWrapper>{iconLeft}</ButtonIconWrapper>
                    )
                )}

                {/* if iconOnly size, don't render text */}
                {size === 'iconOnly' ? null : (children ? children : <ButtonTextWrapper collapsed={collapsed}>{content}</ButtonTextWrapper>)}

                {iconRight && (
                    React.isValidElement(iconRight) && (iconRight as any).type === 'img' ? (
                        <ButtonIconWrapper>
                            <img src={(iconRight as any).props.src} alt={(iconRight as any).props.alt || ''} />
                        </ButtonIconWrapper>
                    ) : (
                        <ButtonIconWrapper>{iconRight}</ButtonIconWrapper>
                    )
                )}
            </StyledButton>
        );
    }
);

Button.displayName = 'Button';

export { Button };