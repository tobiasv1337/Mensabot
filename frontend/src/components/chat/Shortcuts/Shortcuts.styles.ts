import styled from "styled-components";

export const Row = styled.div`
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
`;

export const Pill = styled.button`
    position: relative;
    height: 28px;
    padding: 0 26px 0 12px; /* space for minus */
    border-radius: 999px;

    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.08);

    font-size: 12px;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;

    cursor: pointer;

    &:hover {
        background: rgba(255, 255, 255, 0.12);
    }
`;

export const DeleteButton = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);

  height: 14px;
  width: 14px;
  border-radius: 50%;

  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);

  font-size: 12px;
  line-height: 1;

  display: grid;
  place-items: center;

  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

