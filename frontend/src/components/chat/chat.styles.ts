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
    justify-content: flex-end;

    /* overlay */

    &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(30, 30, 30, 0.9); /* grey transparent overlay */
        z-index: 0;
    }

    /* ensures children are above overlay */

    > * {
        position: relative;
        z-index: 1;
    }
`;


export const BottomArea = styled.div`
  margin-top: auto;
  padding: 12px 16px;
  display: grid;
  gap: 8px;
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



