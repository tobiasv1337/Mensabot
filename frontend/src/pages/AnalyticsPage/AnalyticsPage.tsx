import React, { useState } from "react";
import { useAppShellContext } from "@/layouts/AppShell/useAppShellContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type { ProjectStatsLeaderboardEntry, ProjectStatsShare, ProjectStatsTrendPoint } from "@/shared/api/MensaBotClient";
import FeatureCard from "@/shared/ui/cards/FeatureCard";
import { AboutUsIcon, AnalyticsIcon, ChatIcon, CitiesIcon, MCPIcon, MensenIcon, MicrophoneIcon, ShortcutsIcon } from "@/shared/ui/icons";
import * as P from "@/shared/ui/page/PageHero.styles";
import * as S from "./AnalyticsPage.styles";
import { useAnalyticsStats } from "./useAnalyticsStats";

type TrendMetricKey = "active_users" | "messages" | "interactions" | "sessions" | "llm_messages" | "quick_lookup_messages" | "shortcut_messages" | "tool_calls" | "transcribe_requests";
type TrendRangeKey = "7" | "30" | "all";

type TrendSeriesConfig = {
  key: TrendMetricKey;
  label: string;
  color: string;
};

type ShareCardProps = {
  title: string;
  subtitle: string;
  items: ProjectStatsShare[];
  colors: string[];
  totalLabel: string;
};

type LeaderboardCardProps = {
  title: string;
  subtitle: string;
  entries: ProjectStatsLeaderboardEntry[];
  emptyLabel: string;
  formatLabel?: (entry: ProjectStatsLeaderboardEntry) => string;
  formatHint?: (entry: ProjectStatsLeaderboardEntry) => string | null;
};

type TrendPanelProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ariaLabel: string;
  emptyLabel: string;
  points: ProjectStatsTrendPoint[];
  series: TrendSeriesConfig[];
  range: TrendRangeKey;
  rangeLabels: Record<TrendRangeKey, string>;
  onRangeChange: (range: TrendRangeKey) => void;
};

const numberFormatter = new Intl.NumberFormat();
const compactFormatter = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const formatCount = (value: number) => numberFormatter.format(Math.round(value));
const formatCompact = (value: number) => compactFormatter.format(Math.round(value));
const formatPercent = (value: number) => percentFormatter.format(Number.isFinite(value) ? value : 0);
const formatDecimal = (value: number) => decimalFormatter.format(Number.isFinite(value) ? value : 0);
const formatHourRange = (hour: number) => `${hour.toString().padStart(2, "0")}:00-${((hour + 1) % 24).toString().padStart(2, "0")}:00`;
const formatDate = (date: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(date));
const formatDateTime = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
const sumTrendMetric = (points: ProjectStatsTrendPoint[], key: TrendMetricKey) => points.reduce((sum, point) => sum + point[key], 0);
const getTotalShare = (items: ProjectStatsShare[]) => items.reduce((sum, item) => sum + item.value, 0);
const titleCase = (value: string) => value.split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getShareGradient = (items: ProjectStatsShare[], colors: string[], fallback: string) => {
  const total = getTotalShare(items);
  if (total <= 0) {
    return `conic-gradient(${fallback} 0deg 360deg)`;
  }

  let current = 0;
  const segments = items.map((item, index) => {
    const start = current;
    current += (item.value / total) * 360;
    return `${colors[index % colors.length]} ${start}deg ${current}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
};

const getTrendValue = (point: ProjectStatsTrendPoint, key: TrendMetricKey) => {
  const value = point[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const getShareLabel = (id: string, fallback: string, t: ReturnType<typeof useTranslation>["t"]) => {
  if (id === "llm_chat") return t("analytics.labels.llmChat");
  if (id === "quick_lookup") return t("analytics.labels.quickLookup");
  if (id === "typed") return t("analytics.labels.typed");
  if (id === "voice") return t("analytics.labels.voice");
  if (id === "shortcut") return t("analytics.labels.shortcut");
  if (id === "none") return t("analytics.labels.noDietFilter");
  if (id === "vegetarian") return t("analytics.labels.vegetarian");
  if (id === "vegan") return t("analytics.labels.vegan");
  if (id === "meat") return t("analytics.labels.meat");
  return fallback;
};

const getFilterLabel = (entry: ProjectStatsLeaderboardEntry, t: ReturnType<typeof useTranslation>["t"]) => {
  if (entry.key === "none") return t("analytics.labels.noFilter");
  if (entry.key === "diet:vegetarian") return t("analytics.labels.vegetarian");
  if (entry.key === "diet:vegan") return t("analytics.labels.vegan");
  if (entry.key === "diet:meat_only" || entry.key === "diet:meat") return t("analytics.labels.meat");
  if (entry.key.startsWith("price:")) return titleCase(entry.key.slice(6));
  if (entry.key.startsWith("allergen:")) return entry.label.toUpperCase();
  return titleCase(entry.label);
};

const getToolLabel = (entry: ProjectStatsLeaderboardEntry) => titleCase(entry.label || entry.key);

const getInsightValue = (value: number, mode: "count" | "percent" | "decimal" = "count") => {
  if (mode === "percent") return formatPercent(value);
  if (mode === "decimal") return formatDecimal(value);
  return formatCount(value);
};

const ShareCard = ({ title, subtitle, items, colors, totalLabel }: ShareCardProps) => {
  const total = getTotalShare(items);
  const dominant = items.reduce<ProjectStatsShare | null>((best, item) => (!best || item.value > best.value ? item : best), null);
  const dominantShare = total > 0 && dominant ? dominant.value / total : 0;
  const gradient = getShareGradient(items, colors, "rgba(0,0,0,0.08)");

  return (
    <S.ShareCard>
      <S.PanelHeader>
        <S.PanelHeaderText>
          <S.PanelEyebrow>{totalLabel}</S.PanelEyebrow>
          <S.PanelTitle>{title}</S.PanelTitle>
          <S.PanelSubtitle>{subtitle}</S.PanelSubtitle>
        </S.PanelHeaderText>
      </S.PanelHeader>
      <S.ShareBody>
        <S.ShareRing style={{ background: gradient }}>
          <S.ShareRingCenter>
            <div>
              <S.ShareCenterValue>{formatPercent(dominantShare)}</S.ShareCenterValue>
              <S.ShareCenterLabel>{dominant?.label ?? totalLabel}</S.ShareCenterLabel>
            </div>
          </S.ShareRingCenter>
        </S.ShareRing>
        <S.LegendList>
          {items.map((item, index) => (
            <S.LegendRow key={item.id}>
              <S.LegendSwatch $color={colors[index % colors.length]} />
              <S.LegendLabel>{item.label}</S.LegendLabel>
              <S.LegendValue>{formatCount(item.value)}</S.LegendValue>
            </S.LegendRow>
          ))}
        </S.LegendList>
      </S.ShareBody>
    </S.ShareCard>
  );
};

const LeaderboardCard = ({ title, subtitle, entries, emptyLabel, formatLabel, formatHint }: LeaderboardCardProps) => {
  const maxCount = Math.max(...entries.map((entry) => entry.count), 1);

  return (
    <S.LeaderboardCard>
      <S.PanelHeader>
        <S.PanelHeaderText>
          <S.PanelEyebrow>{title}</S.PanelEyebrow>
          <S.PanelTitle>{subtitle}</S.PanelTitle>
        </S.PanelHeaderText>
      </S.PanelHeader>
      {entries.length > 0 ? (
        <S.LeaderboardList>
          {entries.map((entry) => {
            const hint = formatHint?.(entry) ?? null;

            return (
              <S.LeaderboardRow key={entry.key}>
                <S.LeaderboardTop>
                  <S.LeaderboardLabelWrap>
                    <S.LeaderboardLabel>{formatLabel ? formatLabel(entry) : entry.label}</S.LeaderboardLabel>
                    {hint ? <S.LeaderboardHint>{hint}</S.LeaderboardHint> : null}
                  </S.LeaderboardLabelWrap>
                  <S.LeaderboardValue>{formatCount(entry.count)}</S.LeaderboardValue>
                </S.LeaderboardTop>
                <S.LeaderboardTrack>
                  <S.LeaderboardFill $width={(entry.count / maxCount) * 100} />
                </S.LeaderboardTrack>
              </S.LeaderboardRow>
            );
          })}
        </S.LeaderboardList>
      ) : (
        <S.EmptyState>{emptyLabel}</S.EmptyState>
      )}
    </S.LeaderboardCard>
  );
};

const TrendPanel: React.FC<TrendPanelProps> = ({ eyebrow, title, subtitle, ariaLabel, emptyLabel, points, series, range, rangeLabels, onRangeChange }) => {
  const theme = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const visiblePoints = range === "all" ? points : points.slice(-Number(range));
  const hasData = visiblePoints.some((point) => series.some((item) => getTrendValue(point, item.key) > 0));
  const maxValue = hasData
    ? Math.max(...visiblePoints.flatMap((point) => series.map((item) => getTrendValue(point, item.key))))
    : 0;
  const scaleMax = maxValue > 0 ? Math.ceil(maxValue * 1.08) : 1;
  const chartWidth = 760;
  const chartHeight = 280;
  const chartPadding = { top: 24, right: 14, bottom: 44, left: 48 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const gradientId = `trend-fill-${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`;
  const xPositions = visiblePoints.map((_, index) => (
    chartPadding.left + (visiblePoints.length <= 1 ? chartInnerWidth / 2 : (index / (visiblePoints.length - 1)) * chartInnerWidth)
  ));
  const seriesPaths = series.map((item) => {
    const coordinates = visiblePoints.map((point, index) => ({
      x: xPositions[index],
      y: chartPadding.top + chartInnerHeight - (getTrendValue(point, item.key) / scaleMax) * chartInnerHeight,
    }));

    return {
      ...item,
      coordinates,
      linePath: coordinates.length > 1 ? `M ${coordinates.map((point) => `${point.x} ${point.y}`).join(" L ")}` : "",
    };
  });
  const areaCoordinates = visiblePoints.map((_, index) => ({
    x: xPositions[index],
    y: Math.min(...seriesPaths.map((item) => item.coordinates[index]?.y ?? chartPadding.top + chartInnerHeight)),
  }));
  const areaPath = areaCoordinates.length > 1
    ? `M ${areaCoordinates[0].x} ${chartPadding.top + chartInnerHeight} L ${areaCoordinates.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${areaCoordinates[areaCoordinates.length - 1].x} ${chartPadding.top + chartInnerHeight} Z`
    : "";
  const activeIndex = hoveredIndex ?? visiblePoints.length - 1;
  const activePoint = activeIndex >= 0 ? (visiblePoints[activeIndex] ?? null) : null;
  const activeX = activeIndex >= 0 ? (xPositions[activeIndex] ?? null) : null;
  const yAxisValues = Array.from(new Set([scaleMax, Math.round(scaleMax / 2), 0])).sort((a, b) => b - a);
  const xAxisIndices = Array.from(new Set([0, Math.max(0, Math.floor((xPositions.length - 1) / 2)), Math.max(0, xPositions.length - 1)]));
  const hoverZones = xPositions.map((x, index) => {
    const left = index === 0 ? chartPadding.left : (xPositions[index - 1] + x) / 2;
    const right = index === xPositions.length - 1 ? chartWidth - chartPadding.right : (x + xPositions[index + 1]) / 2;
    return { index, x: left, width: right - left };
  });

  return (
    <S.Panel>
      <S.PanelHeader>
        <S.PanelHeaderText>
          <S.PanelEyebrow>{eyebrow}</S.PanelEyebrow>
          <S.PanelTitle>{title}</S.PanelTitle>
          <S.PanelSubtitle>{subtitle}</S.PanelSubtitle>
        </S.PanelHeaderText>
        <S.ControlRow>
          {(["7", "30", "all"] as TrendRangeKey[]).map((nextRange) => (
            <S.SegmentedButton key={nextRange} $active={range === nextRange} $tone="red" onClick={() => onRangeChange(nextRange)}>
              {rangeLabels[nextRange]}
            </S.SegmentedButton>
          ))}
        </S.ControlRow>
      </S.PanelHeader>

      <S.TrendLegend>
        {series.map((item) => (
          <S.TrendLegendItem key={item.key}>
            <S.TrendLegendDot $color={item.color} />
            <span>{item.label}</span>
          </S.TrendLegendItem>
        ))}
      </S.TrendLegend>

      {hasData ? (
        <S.TrendCanvas>
          <S.TrendCanvasInner>
            <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={ariaLabel}>
              <defs>
                <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor={`${theme.accent1}30`} />
                  <stop offset="55%" stopColor={`${theme.accent2}18`} />
                  <stop offset="100%" stopColor={`${theme.accent3}04`} />
                </linearGradient>
              </defs>
              {yAxisValues.map((value) => {
                const y = chartPadding.top + chartInnerHeight - (value / scaleMax) * chartInnerHeight;

                return (
                  <g key={`y-${value}`}>
                    <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke={`${theme.textMuted}22`} strokeDasharray="5 7" />
                    <text x={chartPadding.left - 8} y={y + 4} fill={theme.textMuted} fontSize="12" fontWeight="700" textAnchor="end">
                      {formatCompact(value)}
                    </text>
                  </g>
                );
              })}
              {[0.25, 0.75].map((step) => {
                const y = chartPadding.top + chartInnerHeight * step;
                return <line key={`mid-${step}`} x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke={`${theme.textMuted}16`} strokeDasharray="5 7" />;
              })}
              {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
              {activeX !== null ? (
                <line x1={activeX} x2={activeX} y1={chartPadding.top} y2={chartPadding.top + chartInnerHeight} stroke={`${theme.textMuted}2C`} strokeDasharray="4 6" />
              ) : null}
              {seriesPaths.map((item) => (
                item.linePath ? <path key={item.key} d={item.linePath} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null
              ))}
              {seriesPaths.map((item) => {
                const coordinate = activeIndex >= 0 ? (item.coordinates[activeIndex] ?? null) : null;
                if (!coordinate) return null;

                return (
                  <circle
                    key={`${item.key}-active`}
                    cx={coordinate.x}
                    cy={coordinate.y}
                    r={6}
                    fill={theme.surfaceCard}
                    stroke={item.color}
                    strokeWidth="3"
                  />
                );
              })}
              {hoverZones.map((zone) => (
                <rect
                  key={`hover-${zone.index}`}
                  x={zone.x}
                  y={chartPadding.top}
                  width={zone.width}
                  height={chartInnerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(zone.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
              {xAxisIndices.map((index) => {
                const label = visiblePoints[index];
                const x = xPositions[index];

                if (!label || x === undefined) return null;

                return (
                  <text key={`${label.date}-${index}`} x={x} y={chartHeight - 10} fill={theme.textMuted} fontSize="12" fontWeight="700" textAnchor="middle">
                    {formatDate(label.date)}
                  </text>
                );
              })}
            </svg>
          </S.TrendCanvasInner>
        </S.TrendCanvas>
      ) : (
        <S.TrendEmptyState>{emptyLabel}</S.TrendEmptyState>
      )}

      <S.TrendFooter>
        <span>{activePoint ? formatDate(activePoint.date) : emptyLabel}</span>
        {activePoint ? (
          <S.TrendFooterValues>
            {series.map((item) => (
              <S.TrendFooterValue key={`${item.key}-footer`}>
                <S.TrendLegendDot $color={item.color} />
                <span>{item.label}</span>
                <strong>{formatCount(getTrendValue(activePoint, item.key))}</strong>
              </S.TrendFooterValue>
            ))}
          </S.TrendFooterValues>
        ) : null}
      </S.TrendFooter>
    </S.Panel>
  );
};

const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isOffline } = useAppShellContext();
  const theme = useTheme();
  const { stats, isLoading, error } = useAnalyticsStats(isOffline);
  const [trendRange, setTrendRange] = useState<TrendRangeKey>("30");
  const [activeHeatmapKey, setActiveHeatmapKey] = useState<string | null>(null);

  const interactionShare = (stats?.shares.interaction_types ?? []).map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }));
  const originShare = (stats?.shares.message_origins ?? []).map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }));
  const dietShare = (stats?.shares.diet_filters ?? [])
    .map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }))
    .sort((left, right) => {
      const order: Record<string, number> = { vegetarian: 0, vegan: 1, meat: 2, none: 3 };
      return (order[left.id] ?? 99) - (order[right.id] ?? 99);
    });
  const trendPoints = stats?.trend.points ?? [];
  const heatmap = stats?.heatmap ?? [];
  const heatmapLookup = new Map(heatmap.map((cell) => [`${cell.weekday}-${cell.hour}`, cell]));
  const peakHeatmapCell = heatmap.reduce((best, cell) => (cell.count > best.count ? cell : best), { weekday: 0, hour: 0, count: 0 });
  const selectedHeatmapCell = heatmapLookup.get(activeHeatmapKey ?? "") ?? peakHeatmapCell;
  const heatmapMax = Math.max(...heatmap.map((cell) => cell.count), 1);
  const weekdayLabels = [
    t("analytics.heatmap.weekdays.mon"),
    t("analytics.heatmap.weekdays.tue"),
    t("analytics.heatmap.weekdays.wed"),
    t("analytics.heatmap.weekdays.thu"),
    t("analytics.heatmap.weekdays.fri"),
    t("analytics.heatmap.weekdays.sat"),
    t("analytics.heatmap.weekdays.sun"),
  ];
  const totalLlmMessages = sumTrendMetric(trendPoints, "llm_messages");
  const totalQuickLookupMessages = sumTrendMetric(trendPoints, "quick_lookup_messages");
  const peakSlotValue = peakHeatmapCell.count > 0 ? `${weekdayLabels[peakHeatmapCell.weekday]} · ${formatHourRange(peakHeatmapCell.hour)}` : "—";
  const rangeLabels: Record<TrendRangeKey, string> = {
    "7": t("analytics.trend.ranges.7"),
    "30": t("analytics.trend.ranges.30"),
    all: t("analytics.trend.ranges.all"),
  };
  const reachSeries: TrendSeriesConfig[] = [
    { key: "active_users", label: t("analytics.trend.controls.activeUsers"), color: theme.accent1 },
    { key: "sessions", label: t("analytics.trend.controls.sessions"), color: theme.accent2 },
    { key: "messages", label: t("analytics.trend.controls.messages"), color: theme.accent3 },
    { key: "interactions", label: t("analytics.trend.controls.interactions"), color: theme.textPrimary },
  ];
  const behaviorSeries: TrendSeriesConfig[] = [
    { key: "llm_messages", label: t("analytics.trend.controls.llm"), color: theme.accent1 },
    { key: "quick_lookup_messages", label: t("analytics.trend.controls.quickLookup"), color: theme.accent2 },
    { key: "shortcut_messages", label: t("analytics.trend.controls.shortcuts"), color: theme.accent3 },
    { key: "transcribe_requests", label: t("analytics.trend.controls.voice"), color: theme.textPrimary },
  ];

  const kpis = stats ? [
    {
      id: "messages",
      icon: <ChatIcon />,
      label: t("analytics.kpis.messages"),
      value: formatCompact(stats.headline.messages_total),
      meta: t("analytics.kpiMeta.messages", { llm: formatCompact(totalLlmMessages), quick: formatCompact(totalQuickLookupMessages) }),
    },
    {
      id: "users",
      icon: <AboutUsIcon />,
      label: t("analytics.kpis.users"),
      value: formatCompact(stats.headline.users_total),
      meta: t("analytics.kpiMeta.users"),
    },
    {
      id: "active-users-30d",
      icon: <AnalyticsIcon />,
      label: t("analytics.kpis.activeUsers30d"),
      value: formatCompact(stats.headline.active_users_30d),
      meta: t("analytics.kpiMeta.activeUsers30d"),
    },
    {
      id: "sessions",
      icon: <ChatIcon />,
      label: t("analytics.kpis.sessions"),
      value: formatCompact(stats.headline.sessions_total),
      meta: t("analytics.kpiMeta.sessions", { value: formatDecimal(stats.headline.average_messages_per_session) }),
    },
    {
      id: "chats",
      icon: <MensenIcon />,
      label: t("analytics.kpis.chats"),
      value: formatCompact(stats.headline.chats_total),
      meta: t("analytics.kpiMeta.chats", { value: formatDecimal(stats.headline.average_canteens_per_user) }),
    },
    {
      id: "tools",
      icon: <MCPIcon />,
      label: t("analytics.kpis.toolCalls"),
      value: formatCompact(stats.headline.tool_calls_total),
      meta: t("analytics.kpiMeta.tools", { value: formatDecimal(stats.headline.average_tools_per_llm_turn) }),
    },
    {
      id: "shortcut",
      icon: <ShortcutsIcon />,
      label: t("analytics.kpis.shortcuts"),
      value: formatCompact(stats.headline.shortcut_triggered_messages_total),
      meta: t("analytics.kpiMeta.shortcuts"),
    },
    {
      id: "voice",
      icon: <MicrophoneIcon width="24" height="24" />,
      label: t("analytics.kpis.transcribe"),
      value: formatCompact(stats.headline.transcribe_requests_total),
      meta: t("analytics.kpiMeta.voice"),
    },
  ] : [];

  const insights = stats ? [
    {
      id: "distinct-canteens",
      icon: <MensenIcon />,
      value: getInsightValue(stats.headline.distinct_canteens_total),
      title: t("analytics.insights.distinctCanteens"),
    },
    {
      id: "distinct-cities",
      icon: <CitiesIcon />,
      value: getInsightValue(stats.headline.distinct_cities_total),
      title: t("analytics.insights.distinctCities"),
    },
    {
      id: "canteen-coverage",
      icon: <AboutUsIcon />,
      value: formatPercent(stats.availability.total_canteens > 0 ? stats.headline.distinct_canteens_total / stats.availability.total_canteens : 0),
      title: t("analytics.insights.canteenCoverage"),
    },
    {
      id: "peak-slot",
      icon: <AnalyticsIcon />,
      value: peakSlotValue,
      title: t("analytics.heatmap.peakSlot"),
      meta: peakHeatmapCell.count > 0 ? t("analytics.heatmap.tooltip", { value: formatCount(peakHeatmapCell.count) }) : t("analytics.trend.empty"),
    },
  ] : [];

  const heroBadges = stats ? [
    { label: t("analytics.heroSignals.totalMessages"), value: formatCompact(stats.headline.messages_total) },
    { label: t("analytics.heroSignals.totalUsers"), value: formatCompact(stats.headline.users_total) },
    { label: t("analytics.heroSignals.peakTime"), value: peakSlotValue },
  ] : [];

  const statusCard = !stats ? (
    <S.StatusCard>
      <S.PanelHeader>
        <S.PanelHeaderText>
          <S.PanelEyebrow>{t("analytics.status.eyebrow")}</S.PanelEyebrow>
          <S.PanelTitle>
            {isLoading ? t("analytics.status.loadingTitle") : isOffline ? t("analytics.status.offlineTitle") : t("analytics.status.errorTitle")}
          </S.PanelTitle>
          <S.PanelSubtitle>
            {isLoading ? t("analytics.status.loadingBody") : isOffline ? t("analytics.status.offlineBody") : t("analytics.status.errorBody")}
          </S.PanelSubtitle>
        </S.PanelHeaderText>
      </S.PanelHeader>
      {isLoading ? (
        <>
          <S.LoadingBlock />
          <S.LoadingBlock />
          <S.LoadingBlock />
        </>
      ) : (
        <S.EmptyState>{error ?? t("analytics.status.waiting")}</S.EmptyState>
      )}
    </S.StatusCard>
  ) : null;

  return (
    <S.PageContainer>
      <S.HeroGrid>
        <S.HeroContentCard>
          <P.HeroEyebrow>{t("analytics.eyebrow")}</P.HeroEyebrow>
          <P.HeroTitle>{t("analytics.title")}</P.HeroTitle>
          <S.HeroSubtitle>{t("analytics.subtitle")}</S.HeroSubtitle>
          {heroBadges.length > 0 ? (
            <S.HeroBadgeRow>
              {heroBadges.map((badge) => (
                <S.HeroBadge key={badge.label}>
                  <S.HeroBadgeLabel>{badge.label}</S.HeroBadgeLabel>
                  <S.HeroBadgeValue title={badge.value}>{badge.value}</S.HeroBadgeValue>
                </S.HeroBadge>
              ))}
            </S.HeroBadgeRow>
          ) : null}
          <S.HeroMeta>
            {stats ? t("analytics.updatedAt", { value: formatDateTime(stats.updated_at) }) : t("analytics.heroMeta")}
          </S.HeroMeta>
        </S.HeroContentCard>
      </S.HeroGrid>

      {statusCard}

      {stats ? (
        <S.DashboardGrid>
          <S.KPIGrid>
            {kpis.map((kpi, index) => (
              <FeatureCard
                key={kpi.id}
                delay={index}
                density="compact"
                valueMode="compact"
                icon={kpi.icon}
                eyebrow={kpi.label}
                value={kpi.value}
                meta={kpi.meta}
              />
            ))}
          </S.KPIGrid>

          <S.AnalyticsRow>
            <S.TrendColumn>
              <TrendPanel
                eyebrow={t("analytics.trend.reach.eyebrow")}
                title={t("analytics.trend.reach.title")}
                subtitle={t("analytics.trend.reach.subtitle")}
                ariaLabel={t("analytics.trend.reach.ariaLabel")}
                emptyLabel={t("analytics.trend.empty")}
                points={trendPoints}
                series={reachSeries}
                range={trendRange}
                rangeLabels={rangeLabels}
                onRangeChange={setTrendRange}
              />
              <TrendPanel
                eyebrow={t("analytics.trend.behavior.eyebrow")}
                title={t("analytics.trend.behavior.title")}
                subtitle={t("analytics.trend.behavior.subtitle")}
                ariaLabel={t("analytics.trend.behavior.ariaLabel")}
                emptyLabel={t("analytics.trend.empty")}
                points={trendPoints}
                series={behaviorSeries}
                range={trendRange}
                rangeLabels={rangeLabels}
                onRangeChange={setTrendRange}
              />
            </S.TrendColumn>

            <S.ShareColumn>
              <ShareCard
                title={t("analytics.share.interactions.title")}
                subtitle={t("analytics.share.interactions.subtitle")}
                items={interactionShare}
                colors={[theme.accent1, theme.accent3]}
                totalLabel={t("analytics.share.interactions.total")}
              />
              <ShareCard
                title={t("analytics.share.origins.title")}
                subtitle={t("analytics.share.origins.subtitle")}
                items={originShare}
                colors={[theme.accent1, theme.accent2, theme.accent3]}
                totalLabel={t("analytics.share.origins.total")}
              />
              <ShareCard
                title={t("analytics.share.diets.title")}
                subtitle={t("analytics.share.diets.subtitle")}
                items={dietShare}
                colors={[theme.accent1, theme.accent2, theme.accent3, theme.textMuted]}
                totalLabel={t("analytics.share.diets.total")}
              />
            </S.ShareColumn>
          </S.AnalyticsRow>

          <S.Panel>
            <S.PanelHeader>
              <S.PanelHeaderText>
                <S.PanelEyebrow>{t("analytics.heatmap.eyebrow")}</S.PanelEyebrow>
                <S.PanelTitle>{t("analytics.heatmap.title")}</S.PanelTitle>
                <S.PanelSubtitle>{t("analytics.heatmap.subtitle")}</S.PanelSubtitle>
              </S.PanelHeaderText>
            </S.PanelHeader>
            <S.HeatmapLayout>
              <S.HeatmapMeta>
                <S.HeatmapTooltip>
                  <strong>{weekdayLabels[selectedHeatmapCell.weekday]} · {formatHourRange(selectedHeatmapCell.hour)}</strong>
                  <br />
                  {t("analytics.heatmap.tooltip", { value: formatCount(selectedHeatmapCell.count) })}
                </S.HeatmapTooltip>
                <S.HeatmapTooltip>
                  <strong>{t("analytics.heatmap.peakSlot")}</strong>
                  <br />
                  {weekdayLabels[peakHeatmapCell.weekday]} · {formatHourRange(peakHeatmapCell.hour)}
                </S.HeatmapTooltip>
              </S.HeatmapMeta>
              <S.HeatmapGridWrap>
                <S.HeatmapMatrix>
                  <S.HeatmapHours>
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour}>{hour}</div>
                    ))}
                  </S.HeatmapHours>
                  {weekdayLabels.map((label, weekday) => (
                    <S.HeatmapRow key={label}>
                      <S.HeatmapDayLabel>{label}</S.HeatmapDayLabel>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const cell = heatmapLookup.get(`${weekday}-${hour}`) ?? { count: 0 };
                        const intensity = heatmapMax <= 0 ? 0 : cell.count / heatmapMax;
                        const alpha = clamp(0.12 + intensity * 0.88, 0.12, 1);
                        const background = intensity < 0.12 ? `${theme.surfacePage}` : `linear-gradient(180deg, ${theme.accent3}${Math.round(alpha * 255).toString(16).padStart(2, "0")}, ${theme.accent1}${Math.round((0.28 + intensity * 0.52) * 255).toString(16).padStart(2, "0")})`;
                        const isActive = selectedHeatmapCell.weekday === weekday && selectedHeatmapCell.hour === hour;

                        return (
                          <S.HeatmapCell
                            key={`${weekday}-${hour}`}
                            $active={isActive}
                            style={{ background }}
                            onMouseEnter={() => setActiveHeatmapKey(`${weekday}-${hour}`)}
                            onFocus={() => setActiveHeatmapKey(`${weekday}-${hour}`)}
                          />
                        );
                      })}
                    </S.HeatmapRow>
                  ))}
                </S.HeatmapMatrix>
              </S.HeatmapGridWrap>
            </S.HeatmapLayout>
          </S.Panel>

          <S.LeaderboardGrid>
            <LeaderboardCard title={t("analytics.leaderboards.cities.eyebrow")} subtitle={t("analytics.leaderboards.cities.title")} entries={stats.leaderboards.cities} emptyLabel={t("analytics.leaderboards.empty")} />
            <LeaderboardCard title={t("analytics.leaderboards.canteens.eyebrow")} subtitle={t("analytics.leaderboards.canteens.title")} entries={stats.leaderboards.canteens} emptyLabel={t("analytics.leaderboards.empty")} formatHint={(entry) => entry.city ?? null} />
            <LeaderboardCard title={t("analytics.leaderboards.tools.eyebrow")} subtitle={t("analytics.leaderboards.tools.title")} entries={stats.leaderboards.tools} emptyLabel={t("analytics.leaderboards.empty")} formatLabel={getToolLabel} />
            <LeaderboardCard title={t("analytics.leaderboards.filters.eyebrow")} subtitle={t("analytics.leaderboards.filters.title")} entries={stats.leaderboards.filters} emptyLabel={t("analytics.leaderboards.empty")} formatLabel={(entry) => getFilterLabel(entry, t)} />
          </S.LeaderboardGrid>

          <S.InsightGrid>
            {insights.map((insight, index) => (
              <FeatureCard
                key={insight.id}
                delay={index}
                density="compact"
                valueMode={insight.id === "peak-slot" ? "label" : "compact"}
                valueNoWrap={insight.id === "peak-slot"}
                icon={insight.icon}
                value={insight.value}
                title={insight.title}
                meta={insight.meta}
              />
            ))}
          </S.InsightGrid>
        </S.DashboardGrid>
      ) : null}
    </S.PageContainer>
  );
};

export default AnalyticsPage;
