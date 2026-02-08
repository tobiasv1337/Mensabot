import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Canteen, CanteenOpeningHoursResponse, CanteenSearchResponse } from "../../services/api";
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
const MAX_ZOOM = 18;
const CLUSTER_MAX_ZOOM = 14;

const PER_PAGE = 100;
const MAX_PINS = 2000;

const coordKey = (pos: LngLat) => `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`;

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
  type Entry = { canteen: Canteen; pos: LngLat; key: string; selected: boolean };

  const entries: Entry[] = canteens
    .filter((c) => typeof c.lat === "number" && typeof c.lng === "number")
    .map((c) => {
      const pos = { lng: c.lng as number, lat: c.lat as number };
      return { canteen: c, pos, key: coordKey(pos), selected: selectedIds.has(c.id) };
    });

  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const arr = groups.get(entry.key);
    if (arr) arr.push(entry);
    else groups.set(entry.key, [entry]);
  }

  return {
    type: "FeatureCollection" as const,
    features: Array.from(groups.values()).flatMap((group) =>
      group.map((entry, idx) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [entry.pos.lng, entry.pos.lat],
        },
        properties: {
          id: entry.canteen.id,
          name: entry.canteen.name,
          city: entry.canteen.city ?? "",
          address: entry.canteen.address ?? "",
          selected: entry.selected,
          stack_key: entry.key,
          stack_count: group.length,
          stack_index: idx,
        },
      }))
    ),
  };
};

type ThemeSlice = {
  accent1: string; // red
  accent2: string; // orange
  accent3: string; // yellow
  textOnAccent2: string;
  surfacePage: string;
  textPrimary: string;
  textMuted: string;
};

const upsertCanteenLayers = (map: maplibregl.Map, theme: ThemeSlice) => {
  const sourceId = "canteens";

  const hasSource = !!map.getSource(sourceId);
  if (!hasSource) {
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
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
        // Orange accent for grouped canteens
        "circle-color": theme.accent2,
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
        "text-color": theme.textOnAccent2,
      },
    });
  });

  ensureLayer("stack-bubble", () => {
    map.addLayer({
      id: "stack-bubble",
      type: "circle",
      source: sourceId,
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        [">", ["get", "stack_count"], 1],
        ["==", ["get", "stack_index"], 0],
      ],
      paint: {
        "circle-color": theme.accent2,
        "circle-radius": ["step", ["get", "stack_count"], 10, 3, 12, 10, 15],
        "circle-stroke-width": 2,
        "circle-stroke-color": theme.surfacePage,
        "circle-opacity": 0.95,
      },
    });
  });

  ensureLayer("stack-count", () => {
    map.addLayer({
      id: "stack-count",
      type: "symbol",
      source: sourceId,
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        [">", ["get", "stack_count"], 1],
        ["==", ["get", "stack_index"], 0],
      ],
      layout: {
        "text-field": "{stack_count}",
        "text-size": 12,
        "text-font": ["Noto Sans Regular", "Open Sans Regular", "Arial Unicode MS Regular"],
      },
      paint: {
        "text-color": theme.textOnAccent2,
      },
    });
  });

  ensureLayer("single-point", () => {
    map.addLayer({
      id: "single-point",
      type: "circle",
      source: sourceId,
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        ["==", ["get", "stack_count"], 1],
        ["==", ["boolean", ["get", "selected"], false], false],
      ],
      paint: {
        // Red accent marker for a single canteen
        "circle-color": theme.accent1,
        "circle-radius": 7,
        "circle-stroke-width": 2,
        "circle-stroke-color": theme.surfacePage,
        "circle-opacity": 0.94,
      },
    });
  });

  ensureLayer("selected-point", () => {
    map.addLayer({
      id: "selected-point",
      type: "circle",
      source: sourceId,
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        ["==", ["boolean", ["get", "selected"], false], true],
      ],
      paint: {
        // Yellow accent marker for a selected canteen
        "circle-color": theme.accent3,
        "circle-radius": 9,
        "circle-stroke-width": 2,
        "circle-stroke-color": theme.surfacePage,
        "circle-opacity": 0.96,
      },
    });
  });
};

type SpiderState = { center: LngLat; canteens: Canteen[] } | null;

type SpiderProps = Record<string, unknown>;
type SpiderCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, SpiderProps>;

const buildSpiderGeoJson = (args: { map: maplibregl.Map; spider: SpiderState; selectedIds: Set<number> }): SpiderCollection => {
  const { map, spider, selectedIds } = args;
  if (!spider || spider.canteens.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const center = spider.center;
  const n = spider.canteens.length;
  const originPx = map.project([center.lng, center.lat]);
  const radiusPx = Math.min(88, 34 + n * 2.6);

  const features: Array<GeoJSON.Feature<GeoJSON.Geometry, SpiderProps>> = [];

  for (let i = 0; i < n; i++) {
    const c = spider.canteens[i];
    const angle = (2 * Math.PI * i) / n;
    const x = originPx.x + Math.cos(angle) * radiusPx;
    const y = originPx.y + Math.sin(angle) * radiusPx;
    const ll = map.unproject([x, y]);
    const selected = selectedIds.has(c.id);

    const line: GeoJSON.Feature<GeoJSON.LineString, SpiderProps> = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [center.lng, center.lat],
          [ll.lng, ll.lat],
        ],
      },
      properties: { kind: "line" },
    };
    features.push(line);

    const point: GeoJSON.Feature<GeoJSON.Point, SpiderProps> = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [ll.lng, ll.lat],
      },
      properties: {
        kind: "point",
        id: c.id,
        name: c.name,
        city: c.city ?? "",
        address: c.address ?? "",
        selected,
      },
    };
    features.push(point);
  }

  return { type: "FeatureCollection", features };
};

const upsertSpiderLayers = (map: maplibregl.Map, theme: ThemeSlice) => {
  const sourceId = "spider";
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  const ensureLayer = (id: string, add: () => void) => {
    if (!map.getLayer(id)) add();
  };

  ensureLayer("spider-lines", () => {
    map.addLayer({
      id: "spider-lines",
      type: "line",
      source: sourceId,
      filter: ["==", ["get", "kind"], "line"],
      paint: {
        "line-color": theme.textMuted,
        "line-opacity": 0.7,
        "line-width": 2,
      },
    });
  });

  ensureLayer("spider-points", () => {
    map.addLayer({
      id: "spider-points",
      type: "circle",
      source: sourceId,
      filter: ["==", ["get", "kind"], "point"],
      paint: {
        "circle-color": ["case", ["boolean", ["get", "selected"], false], theme.accent3, theme.accent1],
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": theme.surfacePage,
        "circle-opacity": 0.98,
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
  const [spider, setSpider] = useState<SpiderState>(null);
  const [is3d, setIs3d] = useState(false);
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

  const spiderRef = useRef<SpiderState>(null);
  useEffect(() => {
    spiderRef.current = spider;
  }, [spider]);

  const canteensByIdRef = useRef<Map<number, Canteen>>(new Map());
  useEffect(() => {
    const next = new Map<number, Canteen>();
    for (const c of canteens) next.set(c.id, c);
    canteensByIdRef.current = next;
  }, [canteens]);

  const canteensByCoordKeyRef = useRef<Map<string, Canteen[]>>(new Map());
  useEffect(() => {
    const next = new Map<string, Canteen[]>();
    for (const c of canteens) {
      if (typeof c.lat !== "number" || typeof c.lng !== "number") continue;
      const key = coordKey({ lat: c.lat, lng: c.lng });
      const arr = next.get(key);
      if (arr) arr.push(c);
      else next.set(key, [c]);
    }
    canteensByCoordKeyRef.current = next;
  }, [canteens]);

  const openingHoursCacheRef = useRef<Map<number, CanteenOpeningHoursResponse>>(new Map());
  const openingHoursRequestId = useRef(0);
  const [openingHoursState, setOpeningHoursState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    data: CanteenOpeningHoursResponse | null;
  }>({ status: "idle", data: null });

  const setSourceData = useCallback((items: Canteen[]) => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("canteens") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(buildGeoJson(items, selectedIdsRef.current));
  }, []);

  const setSpiderData = useCallback(
    (nextSpider: SpiderState) => {
      const map = mapRef.current;
      if (!map) return;
      const source = map.getSource("spider") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(buildSpiderGeoJson({ map, spider: nextSpider, selectedIds: selectedIdsRef.current }));
    },
    []
  );

  const closeSpider = useCallback(() => {
    setSpider(null);
    setSpiderData(null);
  }, [setSpiderData]);

  const openSpiderForCanteens = useCallback(
    (items: Canteen[], center: LngLat) => {
      const nextItems = items
        .filter((c) => typeof c.lat === "number" && typeof c.lng === "number")
        .slice(0, 20);

      if (nextItems.length <= 1) {
        closeSpider();
        return;
      }

      setActiveCanteen(null);
      const next: SpiderState = { center, canteens: nextItems };
      setSpider(next);
      setSpiderData(next);
    },
    [closeSpider, setSpiderData]
  );

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
        closeSpider();

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
  }, [client, closeSpider]);

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

  const toggle3dMode = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    setIs3d((prev) => {
      const next = !prev;
      if (next) {
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
        map.touchPitch.enable();
        map.easeTo({ pitch: 55, bearing: -20, duration: 650 });
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 450 });
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
        map.touchPitch.disable();
      }
      return next;
    });
  }, []);

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
    map.touchPitch.disable();

    const onStyleLoad = () => {
      const t = themeRef.current;
      upsertCanteenLayers(map, {
        accent1: t.accent1,
        accent2: t.accent2,
        accent3: t.accent3,
        textOnAccent2: t.textOnAccent2,
        surfacePage: t.surfacePage,
        textPrimary: t.textPrimary,
        textMuted: t.textMuted,
      });
      upsertSpiderLayers(map, {
        accent1: t.accent1,
        accent2: t.accent2,
        accent3: t.accent3,
        textOnAccent2: t.textOnAccent2,
        surfacePage: t.surfacePage,
        textPrimary: t.textPrimary,
        textMuted: t.textMuted,
      });
      setSourceData(canteensRef.current);
      setSpiderData(spiderRef.current);
    };

    map.on("style.load", onStyleLoad);
    map.on("load", () => {
      scheduleRefresh();
    });

    map.on("movestart", closeSpider);
    map.on("moveend", () => {
      scheduleRefresh();
    });

    map.on("click", "clusters", (e) => {
      const feature = e.features?.[0] ?? map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
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
          // Nudge a bit further than the expansion zoom so clusters feel like they "open up" more.
          const targetZoom = Math.min(Math.max(zoom, map.getZoom() + 1), MAX_ZOOM);
          map.easeTo({ center: coords, zoom: targetZoom, duration: 420 });
        })
        .catch(() => { });
    });

    const handleCanteenClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const idRaw = feature?.properties?.id;
      const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
      if (!Number.isFinite(id)) return;

      const stackCountRaw = feature?.properties?.stack_count;
      const stackCount = typeof stackCountRaw === "number" ? stackCountRaw : Number(stackCountRaw);
      const stackKey = feature?.properties?.stack_key;

      if (Number.isFinite(stackCount) && stackCount > 1 && typeof stackKey === "string") {
        const items = canteensByCoordKeyRef.current.get(stackKey) ?? [];
        const coords = (feature.geometry as { coordinates?: unknown })?.coordinates as [number, number] | undefined;
        if (!coords) return;
        openSpiderForCanteens(items, { lng: coords[0], lat: coords[1] });
        return;
      }

      // Handle "close but not identical" overlaps by spiderifying all rendered points at the click.
      const rendered = map.queryRenderedFeatures(e.point, { layers: ["single-point", "selected-point"] });
      const candidateIds = Array.from(
        new Set(
          rendered
            .map((f) => {
              const raw = f.properties?.id;
              const num = typeof raw === "number" ? raw : Number(raw);
              return Number.isFinite(num) ? num : null;
            })
            .filter((v): v is number => typeof v === "number")
        )
      );
      if (candidateIds.length > 1) {
        const candidates = candidateIds.map((cid) => canteensByIdRef.current.get(cid)).filter((c): c is Canteen => !!c);
        const coords = (feature.geometry as { coordinates?: unknown })?.coordinates as [number, number] | undefined;
        if (!coords) return;
        openSpiderForCanteens(candidates, { lng: coords[0], lat: coords[1] });
        return;
      }

      const match = canteensByIdRef.current.get(id);
      if (!match) return;
      closeSpider();
      setActiveCanteen(match);

      if (typeof match.lat === "number" && typeof match.lng === "number") {
        map.easeTo({
          center: [match.lng, match.lat],
          offset: [0, -120],
          duration: 450,
        });
      }
    };

    map.on("click", "single-point", handleCanteenClick);
    map.on("click", "selected-point", handleCanteenClick);
    map.on("click", "stack-bubble", (e) => {
      const feature = e.features?.[0];
      const stackKey = feature?.properties?.stack_key;
      if (typeof stackKey !== "string") return;
      const coords = (feature?.geometry as { coordinates?: unknown })?.coordinates as [number, number] | undefined;
      if (!coords) return;
      const items = canteensByCoordKeyRef.current.get(stackKey) ?? [];
      openSpiderForCanteens(items, { lng: coords[0], lat: coords[1] });
    });

    map.on("click", "spider-points", (e) => {
      const feature = e.features?.[0];
      const idRaw = feature?.properties?.id;
      const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
      if (!Number.isFinite(id)) return;
      const match = canteensByIdRef.current.get(id);
      if (!match) return;
      closeSpider();
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
    map.on("mouseenter", "single-point", () => setCursor("pointer"));
    map.on("mouseleave", "single-point", () => setCursor(""));
    map.on("mouseenter", "selected-point", () => setCursor("pointer"));
    map.on("mouseleave", "selected-point", () => setCursor(""));
    map.on("mouseenter", "stack-bubble", () => setCursor("pointer"));
    map.on("mouseleave", "stack-bubble", () => setCursor(""));
    map.on("mouseenter", "spider-points", () => setCursor("pointer"));
    map.on("mouseleave", "spider-points", () => setCursor(""));

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

  useEffect(() => {
    setSpiderData(spider);
  }, [spider, selectedIdsSet, setSpiderData]);

  useEffect(() => {
    const canteen = activeCanteen;
    if (!canteen) {
      setOpeningHoursState({ status: "idle", data: null });
      return;
    }

    const cached = openingHoursCacheRef.current.get(canteen.id);
    if (cached) {
      setOpeningHoursState({ status: "ready", data: cached });
      return;
    }

    const rid = ++openingHoursRequestId.current;
    setOpeningHoursState({ status: "loading", data: null });
    void client
      .getCanteenOpeningHours(canteen.id)
      .then((res) => {
        if (destroyedRef.current) return;
        if (rid !== openingHoursRequestId.current) return;
        openingHoursCacheRef.current.set(canteen.id, res);
        setOpeningHoursState({ status: "ready", data: res });
      })
      .catch(() => {
        if (destroyedRef.current) return;
        if (rid !== openingHoursRequestId.current) return;
        setOpeningHoursState({ status: "error", data: null });
      });
  }, [activeCanteen, client]);

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

  const openingHoursLine = useMemo(() => {
    if (!activeCanteen) return null;
    if (openingHoursState.status === "loading") return "Öffnungszeiten: lade ...";
    if (openingHoursState.status === "error") return "Öffnungszeiten: nicht verfügbar";
    if (openingHoursState.status !== "ready") return null;

    const res = openingHoursState.data;
    if (!res) return null;
    if (res.status !== "ok") {
      if (res.status === "not_found") return "Öffnungszeiten: unbekannt";
      if (res.status === "ambiguous") return "Öffnungszeiten: unsicher (mehrere Treffer)";
      return "Öffnungszeiten: nicht verfügbar";
    }
    if (!res.opening_hours) return "Öffnungszeiten: unbekannt";
    return `Öffnungszeiten: ${res.opening_hours}`;
  }, [activeCanteen, openingHoursState.data, openingHoursState.status]);

  const openingHoursAttribution = useMemo(() => {
    if (openingHoursState.status !== "ready") return null;
    const res = openingHoursState.data;
    if (!res) return null;
    return res.attribution;
  }, [openingHoursState.data, openingHoursState.status]);

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
            <S.ControlButton
              type="button"
              title="3D mode"
              aria-label="3D mode"
              aria-pressed={is3d}
              onClick={toggle3dMode}
            >
              3D
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
              {openingHoursLine && <S.DetailText>{openingHoursLine}</S.DetailText>}
              {openingHoursAttribution && (
                <S.AttributionText>
                  <S.AttributionLink href={openingHoursAttribution.attribution_url} target="_blank" rel="noreferrer">
                    {openingHoursAttribution.attribution}
                  </S.AttributionLink>
                </S.AttributionText>
              )}

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
