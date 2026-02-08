import React, { useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Canteen } from "../services/api";
import { useTheme } from "../theme/useTheme";
import { Page, Content } from "./PageLayout.styles";
import CanteenMap from "../components/map/CanteenMap";
import * as S from "./MapPage.styles";

type MapPageProps = {
  onSelectCanteen: (canteen: Canteen) => void;
  selectedCanteenIds?: number[];
};

const getStyleUrl = (options: { darkMode: boolean }) => {
  const light = import.meta.env.VITE_MAPTILER_STYLE_URL_LIGHT ?? "";
  const dark = import.meta.env.VITE_MAPTILER_STYLE_URL_DARK ?? "";
  return options.darkMode ? dark : light;
};

const MapPage: React.FC<MapPageProps> = ({ onSelectCanteen, selectedCanteenIds = [] }) => {
  const { darkMode } = useTheme();
  const [query, setQuery] = useState("");

  const styleUrl = useMemo(() => getStyleUrl({ darkMode }), [darkMode]);
  const missingLight = !(import.meta.env.VITE_MAPTILER_STYLE_URL_LIGHT ?? "").trim();
  const missingDark = !(import.meta.env.VITE_MAPTILER_STYLE_URL_DARK ?? "").trim();
  const missingConfig = missingLight || missingDark;

  return (
    <Page>
      <Content>
        <S.HeroCard>
          <S.HeroEyebrow>Karte</S.HeroEyebrow>
          <S.HeroTitle>Mensen auf der Karte</S.HeroTitle>
          <S.HeroSubtitle>
            Zoome rein, um Standorte zu entdecken. Tippe auf einen Pin für Details und starte anschließend einen Chat mit der ausgewählten Mensa.
          </S.HeroSubtitle>
        </S.HeroCard>

        <S.SearchCard onSubmit={(e) => e.preventDefault()}>
          <S.SearchRow>
            <S.SearchInput
              type="search"
              placeholder="Mensa oder Stadt eingeben"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Suche nach Mensen auf der Karte"
            />
            <S.SearchActions>
              {query.trim().length > 0 && (
                <S.ClearButton type="button" onClick={() => setQuery("")}>
                  Reset
                </S.ClearButton>
              )}
            </S.SearchActions>
          </S.SearchRow>
          <S.SearchMeta>
            <span>{query.trim().length > 0 ? `Suche: "${query.trim()}"` : "Zeigt Mensen im aktuellen Kartenausschnitt."}</span>
            <S.MetaPill>MapLibre · MapTiler</S.MetaPill>
          </S.SearchMeta>
        </S.SearchCard>

        {missingConfig ? (
          <S.ErrorCard role="alert">
            <S.ErrorTitle>MapTiler Konfiguration fehlt</S.ErrorTitle>
            <S.ErrorBody>
              Bitte setze die Umgebungsvariablen <code>VITE_MAPTILER_STYLE_URL_LIGHT</code> und <code>VITE_MAPTILER_STYLE_URL_DARK</code> (jeweils die komplette
              Style-JSON URL inkl. <code>?key=...</code>).
            </S.ErrorBody>
            <S.ErrorBody>
              Fehlend: {missingLight ? <code>VITE_MAPTILER_STYLE_URL_LIGHT</code> : null}
              {missingLight && missingDark ? " und " : null}
              {missingDark ? <code>VITE_MAPTILER_STYLE_URL_DARK</code> : null}
            </S.ErrorBody>
          </S.ErrorCard>
        ) : (
          <S.MapCard>
            <CanteenMap
              styleUrl={styleUrl}
              query={query}
              selectedCanteenIds={selectedCanteenIds}
              onSelectCanteen={onSelectCanteen}
            />
          </S.MapCard>
        )}
      </Content>
    </Page>
  );
};

export default MapPage;
