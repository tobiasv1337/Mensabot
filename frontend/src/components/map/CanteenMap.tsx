import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Canteen, CanteenSearchResponse } from "../../services/api";
import { getApiClient } from "../../services/apiClient";
import { openGoogleMaps } from "../../services/maps";
import { useTheme } from "../../theme/useTheme";
import * as S from "./CanteenMap.styles";

type Props = {
  styleUrl: string;
  query: string;
  selectedCanteenIds: number[];
  onSelectCanteen: (canteen: Canteen) => void;
};

type LngLat = { lng: number; lat: number };

const DEFAULT_CENTER: LngLat = { lng: 10.4515, lat: 51.1657 }; // Germany
const DEFAULT_ZOOM = 5;
const USER_ZOOM = 12;

const PER_PAGE = 100;
const MAX_PINS = 2000;

const haversineKm = (a: LngLat, b: LngLat) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const computeViewportRadiusKm = (map: maplibregl.Map) => {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const corners = [
    bounds.getNorthEast(),
    bounds.getNorthWest(),
    bounds.getSouthEast(),
    bounds.getSouthWest(),
  ];
  const c: LngLat = { lng: center.lng, lat: center.lat };
  const max = corners.reduce((acc, corner) => {
    const d = haversineKm(c, { lng: corner.lng, lat: corner.lat });
    return Math.max(acc, d);
  }, 0);
  return Math.max(0.25, max * 1.05);
};

const buildGeoJson = (canteens: Canteen[], selectedIds: Set<number>) => {
  return {
    type: "FeatureCollection" as const,
    features: canteens
      .filter((c) => typeof c.lat === "number" && typeof c.lng === "number")
      .map((c) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [c.lng as number, c.lat as number],
        },
        properties: {
          id: c.id,
          name: c.name,
          city: c.city ?? "",
          address: c.address ?? "",
          selected: selectedIds.has(c.id),
        },
      })),
  };
};

const upsertCanteenLayers = (map: maplibregl.Map, theme: { accent1: string; accent2: string; accent3: string; surfacePage: string; textPrimary: string }) => {
  const sourceId = "canteens";

  const hasSource = !!map.getSource(sourceId);
  if (!hasSource) {
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 14,
    });
  }

  const ensureLayer = (id: string, add: () => void) => {
    if (!map.getLayer(id)) add();
  };

  ensureLayer("clusters", () => {
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], theme.accent3, 25, theme.accent2, 100, theme.accent1],
        "circle-radius": ["step", ["get", "point_count"], 16, 25, 20, 100, 26],
        "circle-stroke-width": 2,
        "circle-stroke-color": theme.surfacePage,
        "circle-opacity": 0.92,
      },
    });
  });

  ensureLayer("cluster-count", () => {
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12,
        "text-font": ["Noto Sans Regular", "Open Sans Regular", "Arial Unicode MS Regular"],
      },
      paint: {
        "text-color": theme.textPrimary,
      },
    });
  });

  ensureLayer("unclustered-point", () => {
    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["case", ["boolean", ["get", "selected"], false], theme.accent1, theme.accent2],
        "circle-radius": ["case", ["boolean", ["get", "selected"], false], 9, 7],
        "circle-stroke-width": 2,
        "circle-stroke-color": theme.surfacePage,
        "circle-opacity": 0.94,
      },
    });
  });
};

const CanteenMap: React.FC<Props> = ({ styleUrl, query, selectedCanteenIds, onSelectCanteen }) => {
  const client = useMemo(() => getApiClient(), []);
  const { currentTheme } = useTheme();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const appliedStyleUrlRef = useRef<string | null>(null);
  const destroyedRef = useRef(false);

  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const onSelectRef = useRef(onSelectCanteen);
  useEffect(() => {
    onSelectRef.current = onSelectCanteen;
  }, [onSelectCanteen]);

  const requestId = useRef(0);
  const refreshTimer = useRef<number | null>(null);

  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [isCapped, setIsCapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeCanteen, setActiveCanteen] = useState<Canteen | null>(null);
  const [userLocation, setUserLocation] = useState<LngLat | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const selectedIdsSet = useMemo(() => new Set(selectedCanteenIds), [selectedCanteenIds]);

  const themeRef = useRef(currentTheme);
  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  const selectedIdsRef = useRef(selectedIdsSet);
  useEffect(() => {
    selectedIdsRef.current = selectedIdsSet;
  }, [selectedIdsSet]);

  const canteensRef = useRef<Canteen[]>([]);
  useEffect(() => {
    canteensRef.current = canteens;
  }, [canteens]);

  const canteensByIdRef = useRef<Map<number, Canteen>>(new Map());
  useEffect(() => {
    const next = new Map<number, Canteen>();
    for (const c of canteens) next.set(c.id, c);
    canteensByIdRef.current = next;
  }, [canteens]);

  const setSourceData = useCallback((items: Canteen[]) => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("canteens") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(buildGeoJson(items, selectedIdsRef.current));
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      const map = mapRef.current;
      if (!map) return;

      const center = map.getCenter();
      const radiusKm = computeViewportRadiusKm(map);
      void (async () => {
        const rid = ++requestId.current;
        if (destroyedRef.current) return;
        setLoading(true);
        setError(null);
        setTotalResults(null);
        setIsCapped(false);
        setCanteens([]);

        const trimmed = queryRef.current.trim();
        const queryParam = trimmed.length > 0 ? trimmed : undefined;

        try {
          const results = new Map<number, Canteen>();
          let page = 1;
          let total: number | null = null;

          while (results.size < MAX_PINS) {
            const response: CanteenSearchResponse = await client.searchCanteens({
              query: queryParam,
              nearLat: center.lat,
              nearLng: center.lng,
              radiusKm,
              page,
              perPage: PER_PAGE,
              minScore: 0,
              hasCoordinates: true,
              sortBy: "distance",
            });

            if (destroyedRef.current) return;
            if (rid !== requestId.current) return;

            if (total === null) {
              total = response.total_results;
              setTotalResults(total);
            }

            for (const row of response.results) {
              const c = row.canteen;
              if (typeof c.lat !== "number" || typeof c.lng !== "number") continue;
              results.set(c.id, c);
              if (results.size >= MAX_PINS) break;
            }

            const items = Array.from(results.values()).slice(0, MAX_PINS);
            setCanteens(items);
            if (total !== null && items.length >= MAX_PINS && total > items.length) {
              setIsCapped(true);
            }

            if (!response.page_info.has_next) break;
            page = response.page_info.next_page ?? page + 1;
          }

          const finalItems = Array.from(results.values()).slice(0, MAX_PINS);
          setCanteens(finalItems);
          if (total !== null && finalItems.length >= MAX_PINS && total > finalItems.length) {
            setIsCapped(true);
          }

          setActiveCanteen((prev) => {
            if (!prev) return prev;
            return results.has(prev.id) ? prev : null;
          });
        } catch {
          if (destroyedRef.current) return;
          if (rid !== requestId.current) return;
          setError("Mensen konnten nicht geladen werden.");
        } finally {
          if (!destroyedRef.current && rid === requestId.current) {
            setLoading(false);
          }
        }
      })();
    }, 320);
  }, [client]);

  const locateUser = useCallback(
    (options: { recenter: boolean }) => {
      if (!("geolocation" in navigator)) {
        setLocationStatus("error");
        return;
      }

      setLocationStatus("loading");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(next);
          setLocationStatus("ready");
          if (options.recenter) {
            mapRef.current?.easeTo({ center: [next.lng, next.lat], zoom: USER_ZOOM, duration: 750 });
          }
        },
        () => {
          setLocationStatus("error");
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    },
    []
  );

  // Init map
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (mapRef.current) return;

    destroyedRef.current = false;

    const map = new maplibregl.Map({
      container,
      style: styleUrl,
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;
    appliedStyleUrlRef.current = styleUrl;

    // MapTiler requires attribution. We place it bottom-left so our overlay UI doesn't fight it.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    const onStyleLoad = () => {
      const t = themeRef.current;
      upsertCanteenLayers(map, {
        accent1: t.accent1,
        accent2: t.accent2,
        accent3: t.accent3,
        surfacePage: t.surfacePage,
        textPrimary: t.textPrimary,
      });
      setSourceData(canteensRef.current);
    };

    map.on("style.load", onStyleLoad);
    map.on("load", () => {
      scheduleRefresh();
    });

    map.on("moveend", () => {
      scheduleRefresh();
    });

    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      const feature = features[0];
      const clusterIdRaw = feature?.properties?.cluster_id;
      const clusterId = typeof clusterIdRaw === "number" ? clusterIdRaw : Number(clusterIdRaw);
      if (!Number.isFinite(clusterId)) return;
      const source = map.getSource("canteens") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      void source
        .getClusterExpansionZoom(clusterId)
        .then((zoom) => {
          const coords = (feature.geometry as { coordinates?: unknown })?.coordinates as [number, number] | undefined;
          if (!coords) return;
          map.easeTo({ center: coords, zoom });
        })
        .catch(() => { });
    });

    map.on("click", "unclustered-point", (e) => {
      const feature = e.features?.[0];
      const idRaw = feature?.properties?.id;
      const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
      if (!Number.isFinite(id)) return;
      const match = canteensByIdRef.current.get(id);
      if (!match) return;
      setActiveCanteen(match);

      if (typeof match.lat === "number" && typeof match.lng === "number") {
        map.easeTo({
          center: [match.lng, match.lat],
          offset: [0, -120],
          duration: 450,
        });
      }
    });

    const setCursor = (cursor: string) => {
      map.getCanvas().style.cursor = cursor;
    };
    map.on("mouseenter", "clusters", () => setCursor("pointer"));
    map.on("mouseleave", "clusters", () => setCursor(""));
    map.on("mouseenter", "unclustered-point", () => setCursor("pointer"));
    map.on("mouseleave", "unclustered-point", () => setCursor(""));

    // Only auto-locate if permission already granted (avoid prompting on page load).
    (async () => {
      try {
        // TS: "geolocation" is valid in modern browsers; keep a narrow cast for older lib defs.
        const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
        if (!perms?.query) return;
        const status = await perms.query({ name: "geolocation" as PermissionName });
        if (status.state === "granted") {
          locateUser({ recenter: true });
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      destroyedRef.current = true;
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update style (theme switch)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!styleUrl) return;
    if (appliedStyleUrlRef.current === styleUrl) return;
    appliedStyleUrlRef.current = styleUrl;
    map.setStyle(styleUrl);
  }, [styleUrl]);

  // Refresh on query changes
  useEffect(() => {
    scheduleRefresh();
  }, [query, scheduleRefresh]);

  // Re-apply selection highlighting
  useEffect(() => {
    setSourceData(canteens);
  }, [canteens, selectedIdsSet, setSourceData]);

  const distanceLabel = useMemo(() => {
    if (!activeCanteen || !userLocation) return null;
    if (typeof activeCanteen.lat !== "number" || typeof activeCanteen.lng !== "number") return null;
    const km = haversineKm(userLocation, { lat: activeCanteen.lat, lng: activeCanteen.lng });
    if (!Number.isFinite(km)) return null;
    return `${km.toFixed(1)} km`;
  }, [activeCanteen, userLocation]);

  const statusText = useMemo(() => {
    const shown = canteens.length;
    if (loading && shown === 0) return "Lade Mensen ...";
    if (error) return error;
    if (totalResults !== null) {
      if (isCapped) return `Zeige ${shown} von ${totalResults}. Bitte zoomen.`;
      return `Zeige ${shown} von ${totalResults}`;
    }
    return `Zeige ${shown}`;
  }, [canteens.length, error, isCapped, loading, totalResults]);

  const statusTone: "default" | "danger" = error ? "danger" : "default";

  return (
    <S.Root>
      <S.MapContainer ref={containerRef} />

      <S.Overlay>
        <S.StatusPill $tone={statusTone}>
          <span>{statusText}</span>
          {loading && <span style={{ opacity: 0.6, fontWeight: 800 }}>...</span>}
        </S.StatusPill>

        <S.Controls>
          <S.ControlGroup>
            <S.ControlButton
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
            >
              +
            </S.ControlButton>
            <S.ControlButton
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
            >
              -
            </S.ControlButton>
          </S.ControlGroup>

          <S.ControlGroup>
            <S.ControlButton
              type="button"
              title="Locate me"
              aria-label="Locate me"
              onClick={() => locateUser({ recenter: true })}
            >
              GPS
            </S.ControlButton>
          </S.ControlGroup>
        </S.Controls>

        {activeCanteen && (
          <S.DetailsCard role="dialog" aria-label="Mensa Details">
            <S.DetailsHeader>
              <S.DetailsTitle>
                <S.CanteenName>{activeCanteen.name}</S.CanteenName>
                <S.CanteenMeta>
                  {(activeCanteen.city ?? "").trim() ? activeCanteen.city : "Unbekannte Stadt"}
                </S.CanteenMeta>
              </S.DetailsTitle>
              <S.CloseButton type="button" aria-label="Schließen" onClick={() => setActiveCanteen(null)}>
                ×
              </S.CloseButton>
            </S.DetailsHeader>

            <S.DetailsBody>
              {activeCanteen.address && <S.DetailRow>{activeCanteen.address}</S.DetailRow>}

              <S.DetailRow>
                {selectedIdsSet.has(activeCanteen.id) && <S.DetailPill>Ausgewählt</S.DetailPill>}
                {distanceLabel && <S.DetailPill>{distanceLabel}</S.DetailPill>}
                {locationStatus === "error" && <S.DetailPill>Standort nicht verfügbar</S.DetailPill>}
              </S.DetailRow>
            </S.DetailsBody>

            <S.Actions>
              <S.PrimaryAction type="button" onClick={() => onSelectRef.current(activeCanteen)}>
                Chat starten
              </S.PrimaryAction>
              <S.SecondaryAction
                type="button"
                disabled={typeof activeCanteen.lat !== "number" || typeof activeCanteen.lng !== "number"}
                onClick={() => {
                  if (typeof activeCanteen.lat !== "number" || typeof activeCanteen.lng !== "number") return;
                  openGoogleMaps(activeCanteen.lat, activeCanteen.lng);
                }}
              >
                Route
              </S.SecondaryAction>
            </S.Actions>
          </S.DetailsCard>
        )}
      </S.Overlay>
    </S.Root>
  );
};

export default CanteenMap;
