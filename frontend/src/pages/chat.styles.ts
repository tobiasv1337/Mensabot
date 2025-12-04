import styled from "styled-components";

export const Page = styled.div`
  min-height: 100vh;
  background: #1d2027;
  color: #ffffff;
`;

export const Main = styled.main<{ shift?: boolean }>`
  padding-top: 64px; /* zwingend, damit Header nichts überlappt */
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: 1.5rem;

  

  @media (min-width: 768px) {
    margin-left: ${(p) => (p.shift ? "260px" : "0")};
    transition: margin-left 0.2s ease;
  }
`;


export const Container = styled.div`
  max-width: 900px;
  margin: 1.5rem auto 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
`;

export const Subtitle = styled.p`
  color: #c3c7d0;
  font-size: 0.9rem;
`;

export const Window = styled.div`
  background: #262a33;
  padding: 1rem;
  border-radius: 0.8rem;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Message = styled.div<{ self?: boolean }>`
  max-width: 80%;
  padding: 0.55rem 0.75rem;
  border-radius: 0.7rem;
  font-size: 0.9rem;
  align-self: ${(p) => (p.self ? "flex-end" : "flex-start")};
  background: ${(p) => (p.self ? "#4450ff" : "#343946")};
`;

export const InputRow = styled.form`
  display: flex;
  gap: 0.5rem;
`;

export const Input = styled.input`
  flex: 1;
  border-radius: 999px;
  padding: 0.6rem 0.9rem;
  background: #262a33;
  color: white;
  border: 1px solid #2f343f;

  &:focus {
    border-color: #6273ff;
  }
`;

export const Send = styled.button`
  border-radius: 999px;
  padding: 0.6rem 1rem;
  background: #6273ff;
  color: white;
  border: none;
  cursor: pointer;

  &:hover {
    filter: brightness(1.05);
  }
`;

