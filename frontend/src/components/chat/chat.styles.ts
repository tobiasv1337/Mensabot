import styled from "styled-components";
import bgImage from "../../assets/background.png"

export const ChatWrapper = styled.section`
    position: relative;
    height: 100%;
    width: 100%;

    background-image: url("${bgImage}");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;

    display: flex;
    flex-direction: column;
    min-height: 0;

    &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(30, 30, 30, 0.9);
        z-index: 0;
    }

    > * {
        position: relative;
        z-index: 1;
    }
`;


export const ChatContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  /* space so messages start below the top-right button */
  padding-top: 56px;
`;



export const BottomArea = styled.div`
  margin-top: auto;
  padding: 12px 16px;
  display: grid;
  gap: 8px;
`;

export const TopBar = styled.div`
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 2;
`;

export const NewChatButton = styled.button`
  padding: 6px 12px;
  border-radius: 10px;

  font-size: 13px;
  font-weight: 500;

  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);

  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;


//Alternative:
/*

import styled from "styled-components";

export const ChatWrapper = styled.section`
  position: relative;
  height: 100%;
  width: 100%;

  display: flex;
  flex-direction: column;
  min-height: 0;

  background-image: url("/src/assets/background.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(30, 30, 30, 0.65);
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

export const BottomArea = styled.div`
  padding: 12px 16px 8px;
  display: grid;
  gap: 8px;

  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.10);
  backdrop-filter: blur(10px);
`;



 */



