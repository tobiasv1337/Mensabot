// The logic and JSX of the component
import React, { forwardRef } from 'react';
import type { ButtonProps } from './Button.types';
import { StyledButton, ButtonTextWrapper, ButtonIconWrapper } from './Button.styles';


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
                    React.isValidElement(iconLeft) && (iconLeft as React.ReactElement).type === 'img' ? (
                        <ButtonIconWrapper>
                            <img
                                src={(iconLeft as React.ReactElement<{ src?: string }>).props.src}
                                alt={(iconLeft as React.ReactElement<{ alt?: string }>).props.alt || ''}
                            />
                        </ButtonIconWrapper>
                    ) : (
                        <ButtonIconWrapper>{iconLeft}</ButtonIconWrapper>
                    )
                )}

                {/* if iconOnly size, don't render text */}
                {size === 'iconOnly' ? null : (children ? children : <ButtonTextWrapper $collapsed={collapsed}>{content}</ButtonTextWrapper>)}

                {iconRight && (
                    React.isValidElement(iconRight) && (iconRight as React.ReactElement).type === 'img' ? (
                        <ButtonIconWrapper>
                            <img
                                src={(iconRight as React.ReactElement<{ src?: string }>).props.src}
                                alt={(iconRight as React.ReactElement<{ alt?: string }>).props.alt || ''}
                            />
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
