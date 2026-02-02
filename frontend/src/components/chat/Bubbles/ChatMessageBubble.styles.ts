import styled from "styled-components";

const isLight = (theme: any) => theme.textOnPage === theme.textDark;

export const MessageRow = styled.div<{ $isUser: boolean }>`
    display: flex;
    justify-content: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")};
    gap: 0.4rem;
`;

export const Avatar = styled.img`
    width: 32px;
    height: 32px;
    border-radius: 999px;
    margin-top: 0.2rem;
`;

export const MessageContent = styled.div<{ $isUser: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")};
    max-width: 75%;
`;

export const NameTag = styled.div`
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    opacity: 0.55;
    margin-bottom: 0.1rem;
`;

export const MessageBubble = styled.div<{ $isUser: boolean }>`
    padding: 0.4rem 0.65rem;
    font-size: 0.85rem;
    line-height: 1.25;

    /* BACKGROUND */
    background: ${({ theme, $isUser }) =>
            $isUser
                    ? isLight(theme)
                            /* light mode: soft accent surface */
                            ? theme.surfaceAccent
                            /* dark mode: neutral light-on-dark surface */
                            : theme.surfaceCard
                    : /* assistant bubble */
                    theme.surfaceInset};

    /* TEXT COLOR */
    color: ${({ theme, $isUser }) =>
            $isUser
                    ? isLight(theme)
                            ? theme.textOnAccent
                            : theme.textOnCard
                    : theme.textOnInset};

    border-radius: ${({ $isUser }) =>
            $isUser
                    ? "0.8rem 0.8rem 0.2rem 0.8rem"
                    : "0.8rem 0.8rem 0.8rem 0.2rem"};

    border: 1px solid
    ${({ theme, $isUser }) =>
            $isUser
                    ? isLight(theme)
                            ? `color-mix(in srgb, ${theme.textOnAccent} 22%, transparent)`
                            : `color-mix(in srgb, ${theme.textOnCard} 22%, transparent)`
                    : `color-mix(in srgb, ${theme.textMuted} 22%, transparent)`};

    box-shadow:
            0 4px 10px
            ${({ theme }) =>
                    `color-mix(in srgb, ${theme.textDark} 14%, transparent)`};
`;

export const MarkdownResponse = styled.div`
    font-size: 0.85rem;
    line-height: 1.25;

    p {
        margin: 0;
    }

    p + p {
        margin-top: 0.35rem;
    }

    ul,
    ol {
        margin: 0.3rem 0;
        padding-left: 1.4rem;
    }

    li + li {
        margin-top: 0.1rem;
    }

    pre {
        margin: 0.35rem 0;
        padding: 0.45rem 0.6rem;
        font-size: 0.8rem;
        background: ${({ theme }) => theme.surfacePage};
        color: ${({ theme }) => theme.textOnPage};
        border-radius: 0.4rem;
    }

    blockquote {
        margin: 0.3rem 0;
        padding: 0.4rem 0.6rem;
        font-size: 0.8rem;

        background: ${({ theme }) =>
                `color-mix(in srgb, ${theme.accent2} 18%, transparent)`};
        border-left: 3px solid ${({ theme }) => theme.accent2};
    }
`;
