import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MensaBotClient, type Canteen, type CanteenSearchResult } from "@/shared/api/MensaBotClient";
import ScrollablePillRow from "./ScrollablePillRow";
import * as S from "./ChatView.styles";

type CanteenSelectorProps = {
  client: MensaBotClient;
  selectedCanteens: Canteen[];
  onAdd: (canteen: Canteen) => void;
  onRemove: (canteenId: number) => void;
  placeholder?: string;
};

const CanteenSelector: React.FC<CanteenSelectorProps> = ({
  client,
  selectedCanteens,
  onAdd,
  onRemove,
  placeholder,
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("chat.canteenSearch.placeholder");

  const canteenRequestId = useRef(0);
  const canteenAnchorRef = useRef<HTMLDivElement>(null);

  const [canteenFilterOpen, setCanteenFilterOpen] = useState(false);
  const [canteenQuery, setCanteenQuery] = useState("");
  const [canteenResults, setCanteenResults] = useState<CanteenSearchResult[]>([]);
  const [canteenLoading, setCanteenLoading] = useState(false);
  const [canteenError, setCanteenError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);

  const requestSearchLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (!canteenFilterOpen) return;
    if (canteenQuery.trim().length === 0) return;
    if (locationStatus !== "idle") return;
    requestSearchLocation();
  }, [canteenFilterOpen, canteenQuery, locationStatus, requestSearchLocation]);

  const updateDropdownPosition = useCallback(() => {
    const anchor = canteenAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 240), 360);
    const padding = 12;
    let left = rect.left;
    if (left + width > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - width - padding);
    }
    const top = rect.bottom + 6;
    setDropdownStyle({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!canteenFilterOpen || canteenQuery.trim().length === 0) {
      setDropdownStyle(null);
      return;
    }

    updateDropdownPosition();

    const handleWindowChange = () => updateDropdownPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [canteenFilterOpen, canteenQuery, updateDropdownPosition]);

  useEffect(() => {
    const trimmed = canteenQuery.trim();
    if (!canteenFilterOpen || trimmed.length === 0) {
      setCanteenResults([]);
      setCanteenLoading(false);
      setCanteenError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      const requestId = ++canteenRequestId.current;
      setCanteenLoading(true);
      setCanteenError(null);

      try {
        const response = await client.searchCanteens({
          query: trimmed,
          perPage: 8,
          sortBy: trimmed.length > 0 ? "auto" : userLocation ? "distance" : "name",
          nearLat: userLocation?.lat,
          nearLng: userLocation?.lng,
          hasCoordinates: userLocation ? true : undefined,
        });

        if (requestId !== canteenRequestId.current) return;
        setCanteenResults(response.results);
      } catch {
        if (requestId !== canteenRequestId.current) return;
        setCanteenError(t("chat.canteenSearch.loadError"));
      } finally {
        if (requestId === canteenRequestId.current) {
          setCanteenLoading(false);
        }
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [canteenQuery, canteenFilterOpen, client, userLocation, t]);

  const filteredCanteenResults = useMemo(
    () => canteenResults.filter((result) => !selectedCanteens.some((item) => item.id === result.canteen.id)),
    [canteenResults, selectedCanteens]
  );

  const handleAddCanteen = useCallback(
    (canteen: Canteen) => {
      onAdd(canteen);
      setCanteenQuery("");
      setCanteenResults([]);
    },
    [onAdd]
  );

  return (
    <ScrollablePillRow onScroll={updateDropdownPosition}>
      <S.CanteenSearchWrap ref={canteenAnchorRef}>
        <S.PillInputShell $active={canteenFilterOpen} onClick={() => setCanteenFilterOpen(true)}>
          <S.PillInput
            type="search"
            placeholder={resolvedPlaceholder}
            value={canteenQuery}
            onChange={(event) => {
              setCanteenQuery(event.target.value);
              if (!canteenFilterOpen) setCanteenFilterOpen(true);
            }}
            onFocus={() => setCanteenFilterOpen(true)}
            onBlur={() => {
              if (canteenQuery.trim().length === 0) setCanteenFilterOpen(false);
            }}
            style={{
              width: `${Math.min(Math.max(canteenQuery.length + 6, 12), 22)}ch`,
            }}
          />
        </S.PillInputShell>
        {canteenFilterOpen && canteenQuery.trim().length > 0 && dropdownStyle && (
          <S.SearchDropdown style={dropdownStyle}>
            {canteenLoading && <S.SearchDropdownItem $muted>{t("chat.canteenSearch.searching")}</S.SearchDropdownItem>}
            {canteenError && <S.SearchDropdownItem $muted>{canteenError}</S.SearchDropdownItem>}
            {!canteenLoading && !canteenError && filteredCanteenResults.length === 0 && (
              <S.SearchDropdownItem $muted>{t("chat.canteenSearch.noResults")}</S.SearchDropdownItem>
            )}
            {!canteenLoading &&
              !canteenError &&
              filteredCanteenResults.map((result) => (
                <S.SearchDropdownItem
                  key={result.canteen.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleAddCanteen(result.canteen)}
                >
                  <span>{result.canteen.name}</span>
                  <S.SearchDropdownMeta>
                    {result.canteen.city ? result.canteen.city : t("chat.canteenSearch.unknownCity")}
                    {result.distance_km !== undefined ? ` · ${result.distance_km.toFixed(1)} km` : ""}
                  </S.SearchDropdownMeta>
                </S.SearchDropdownItem>
              ))}
          </S.SearchDropdown>
        )}
      </S.CanteenSearchWrap>
      {selectedCanteens.map((canteen) => (
        <S.PillButton
          key={canteen.id}
          type="button"
          $selected
          $removable
          onClick={() => onRemove(canteen.id)}
        >
          <S.PillRemove>×</S.PillRemove>
          {canteen.name}
        </S.PillButton>
      ))}
    </ScrollablePillRow>
  );
};

export default CanteenSelector;
