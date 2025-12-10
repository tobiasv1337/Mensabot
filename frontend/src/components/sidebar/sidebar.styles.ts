import styled from "styled-components";

/* --- BACKDROP (mobile only) --- */
export const Backdrop = styled.div<{ open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  opacity: ${(p) => (p.open ? 1 : 0)};
  pointer-events: ${(p) => (p.open ? "auto" : "none")};
  transition: opacity 0.2s ease;
  z-index: 1090;

  @media (min-width: 768px) {
    display: none;
  }
`;


export const ContentWrapper = styled.div`
  flex: 1;               /* nimmt gesamten Platz ein */
  overflow-y: auto;      /* Inhalt scrollt */
  overflow-x: hidden;
  padding-bottom: 20px;  /* Abstand vor dem Footer */
`;


/* --- SIDEBAR --- */
export const Sidebar = styled.aside<{ open: boolean; collapsed: boolean }>`
  position: fixed;
  left: 0;
  padding-left: 20px;

@media (min-width: 768px) {
  top: 80px;                         
  height: calc(100vh - 80px);

}


@media (max-width: 768px) {
  top: 64px;
  bottom: 0;
   padding: 5px;
  height: auto;            /* Höhe dynamisch */
}

  width: ${({ collapsed }) => (collapsed ? "70px" : "290px")};

  background: #1e1f23;
  color: #ffffff;

  border-right: 1px solid rgba(255, 255, 255, 0.06);

  transition: width 0.25s ease, transform 0.25s ease;
  z-index: 1100;

  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    transform: translateX(${({ open }) => (open ? "0" : "-100%")});
    width: 260px;
    overflow-y: auto;           /*Scrollbar aktivieren! */

  }

  img.white-icon {
  filter: brightness(0) invert(1);
  width: 18px;
  height: 18px; }


    img.white-icons {
    filter: brightness(0) invert(1);
    width: 18px;
    height: 18px;
}
`;

/* --- HEADER SECTION --- */
export const HeaderArea = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 18px 16px 10px 16px;
  
  font-size: 15px;
  font-weight: 600;
    /* ❌ MOBILE: nicht anzeigen */
  @media (max-width: 768px) {
    display: none;
    

  }
`;

export const CollapseToggle = styled.button`
  border: none;
  background: transparent;
  color: #c8c9cc;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: #ffffff;
  }
`;

/* --- LIST ITEMS --- */
export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 12px;
  margin-bottom: 8px;
 @media (max-width: 768px) {
    margin-top: 20px;
  }
`;

export const Item = styled.button<{ active?: boolean }>`
  all: unset;

  display: flex;
  align-items: center;
  gap: 10px;

  padding: 10px 12px;
  border-radius: 10px;

  cursor: pointer;

  font-size: 14px;
  color: ${({ active }) => (active ? "#ffffff" : "#c8c9cc")};
  background: ${({ active }) => (active ? "#383a40" : "transparent")};

  transition: background 0.15s ease;

  &:hover {
    background: #2b2d31;
  }
`;

export const Icon = styled.span`
  font-size: 16px;
  width: 20px;
  text-align: center;

  img.white-icon {
    filter: brightness(0) invert(1);
    width: 18px;
    height: 18px;
  }
`;

/* --- FOOTER (THEME SWITCH) --- */
export const Footer = styled.div`
  /* Standard: kleiner Abstand unterhalb der Inhalte */
  margin-top: 12px;
  padding: 16px 12px;

  width: 100%;
  display: flex;
  justify-content: center;
  box-sizing: border-box;

  /* Nur auf Desktop nach ganz unten schieben */
  @media (min-width: 768px) {
    margin-top: auto;
  }
      @media (max-width: 768px) {
    margin-top: 55px;
  }
`;


export const ThemeContainer = styled.div`
  display: flex;
  background: #2b2d31;
  padding: 4px;
  border-radius: 10px;
  gap: 4px;

  width: auto;               /* ← wichtigste Zeile */
  box-sizing: border-box;
`;


export const ThemeBtn = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;

  padding: 4px 10px;
  border-radius: 8px;

  font-size: 12px;
  font-weight: 500;

  border: none;
  cursor: pointer;

  background: ${({ active }) => (active ? "#3b3e43" : "transparent")};
  color: ${({ active }) => (active ? "#ffffff" : "#d0d0d0")};

  transition: 0.18s ease;

  &:hover {
    background: ${({ active }) => (active ? "#3f4348" : "#35383d")};
  }
`;



export const Spacer = styled.div`
  height: 50px;
`;

