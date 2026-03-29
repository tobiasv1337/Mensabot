import React, { useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAppShellContext } from "../layouts/useAppShellContext";
import { useTheme } from "../theme/useTheme";
import { Page, Content } from "./PageLayout.styles";
import CanteenMap from "../components/map/CanteenMap";
import * as S from "./MapPage.styles";
import { useTranslation } from "react-i18next";

const getStyleUrl = (options: { darkMode: boolean }) => {
  const light = import.meta.env.VITE_MAPTILER_STYLE_URL_LIGHT ?? "";
  const dark = import.meta.env.VITE_MAPTILER_STYLE_URL_DARK ?? "";
  return options.darkMode ? dark : light;
};

const MapPage: React.FC = () => {
  const { darkMode } = useTheme();
  const { t } = useTranslation();
  const { onSelectCanteen, selectedCanteenIds, isOffline } = useAppShellContext();
  const [query, setQuery] = useState("");

  const styleUrl = useMemo(() => getStyleUrl({ darkMode }), [darkMode]);
  const missingLight = !(import.meta.env.VITE_MAPTILER_STYLE_URL_LIGHT ?? "").trim();
  const missingDark = !(import.meta.env.VITE_MAPTILER_STYLE_URL_DARK ?? "").trim();
  const missingConfig = missingLight || missingDark;

  return (
    <Page>
      <Content>
        <S.HeroCard>
          <S.HeroEyebrow>{t('map.eyebrow')}</S.HeroEyebrow>
          <S.HeroTitle>{t('map.title')}</S.HeroTitle>
          <S.HeroSubtitle>
            {t('map.subtitle')}
          </S.HeroSubtitle>
        </S.HeroCard>

        <S.SearchCard onSubmit={(e) => e.preventDefault()}>
          <S.SearchRow>
            <S.SearchInput
              type="search"
              placeholder={t('map.searchPlaceholder')}
              value={query}
              disabled={isOffline}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('map.searchAriaLabel')}
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
            <span>{query.trim().length > 0 ? t('map.searchFor', { query: query.trim() }) : t('map.defaultHint')}</span>
            <S.MetaPill>MapLibre · MapTiler</S.MetaPill>
          </S.SearchMeta>
        </S.SearchCard>

        {isOffline ? (
          <S.ErrorCard role="alert">
            <S.ErrorTitle>{t('map.offlineTitle')}</S.ErrorTitle>
            <S.ErrorBody>
              {t('map.offlineBody')}
            </S.ErrorBody>
          </S.ErrorCard>
        ) : missingConfig ? (
          <S.ErrorCard role="alert">
            <S.ErrorTitle>{t('map.errorTitle')}</S.ErrorTitle>
            <S.ErrorBody>
              {t('map.errorBody')}
            </S.ErrorBody>
            <S.ErrorBody>
              {t('map.errorMissing')}: {missingLight ? <code>VITE_MAPTILER_STYLE_URL_LIGHT</code> : null}
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
