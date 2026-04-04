import React, { useState } from "react";
import { useAppShellContext } from "@/layouts/AppShell/useAppShellContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type {
  ProjectStatsLeaderboardEntry,
  ProjectStatsPeriodKey,
  ProjectStatsShare,
  ProjectStatsTrendGranularity,
  ProjectStatsTrendPoint,
} from "@/shared/api/MensaBotClient";
import FeatureCard from "@/shared/ui/cards/FeatureCard";
import { AboutUsIcon, AnalyticsIcon, ChatIcon, CitiesIcon, MCPIcon, MensenIcon, MicrophoneIcon, ShortcutsIcon } from "@/shared/ui/icons";
import * as P from "@/shared/ui/page/PageHero.styles";
import * as S from "./AnalyticsPage.styles";
import { useAnalyticsStats } from "./useAnalyticsStats";

type TrendMetricKey = "active_users" | "messages" | "interactions" | "sessions" | "llm_messages" | "quick_lookup_messages" | "shortcut_messages" | "tool_calls" | "transcribe_requests";

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
  overallLabel: string;
  points: ProjectStatsTrendPoint[];
  granularity: ProjectStatsTrendGranularity;
  series: TrendSeriesConfig[];
};

type InsightCard = {
  id: string;
  icon: React.ReactNode;
  value: string;
  title: string;
  meta: string;
  description?: string;
};

const PERIOD_KEYS: ProjectStatsPeriodKey[] = ["today", "7d", "30d", "ytd", "total"];
const numberFormatter = new Intl.NumberFormat();
const compactFormatter = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const formatCount = (value: number) => numberFormatter.format(Math.round(value));
const formatCompact = (value: number) => compactFormatter.format(Math.round(value));
const formatPercent = (value: number) => percentFormatter.format(Number.isFinite(value) ? value : 0);
const formatDecimal = (value: number) => decimalFormatter.format(Number.isFinite(value) ? value : 0);
const formatHourRange = (hour: number) => `${hour.toString().padStart(2, "0")}:00-${((hour + 1) % 24).toString().padStart(2, "0")}:00`;
const formatDateTime = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
const sumTrendMetric = (points: ProjectStatsTrendPoint[], key: TrendMetricKey) => points.reduce((sum, point) => sum + point[key], 0);
const getTotalShare = (items: ProjectStatsShare[]) => items.reduce((sum, item) => sum + item.value, 0);
const titleCase = (value: string) => value.split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatBucketAxisLabel = (bucketStart: string, granularity: ProjectStatsTrendGranularity) => {
  const date = new Date(bucketStart);
  if (granularity === "hour") {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

const formatBucketDetailLabel = (bucketStart: string, granularity: ProjectStatsTrendGranularity) => {
  const date = new Date(bucketStart);
  if (granularity === "hour") {
    return new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
};

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

const TrendPanel: React.FC<TrendPanelProps> = ({ eyebrow, title, subtitle, ariaLabel, emptyLabel, overallLabel, points, granularity, series }) => {
  const theme = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hasData = points.some((point) => series.some((item) => getTrendValue(point, item.key) > 0));
  const maxValue = hasData
    ? Math.max(...points.flatMap((point) => series.map((item) => getTrendValue(point, item.key))))
    : 0;
  const scaleMax = maxValue > 0 ? Math.ceil(maxValue * 1.08) : 1;
  const chartWidth = 760;
  const chartHeight = 280;
  const chartPadding = { top: 24, right: 14, bottom: 44, left: 48 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const gradientId = `trend-fill-${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`;
  const xPositions = points.map((_, index) => (
    chartPadding.left + (points.length <= 1 ? chartInnerWidth / 2 : (index / (points.length - 1)) * chartInnerWidth)
  ));
  const seriesPaths = series.map((item) => {
    const coordinates = points.map((point, index) => ({
      x: xPositions[index],
      y: chartPadding.top + chartInnerHeight - (getTrendValue(point, item.key) / scaleMax) * chartInnerHeight,
    }));

    return {
      ...item,
      coordinates,
      linePath: coordinates.length > 1 ? `M ${coordinates.map((point) => `${point.x} ${point.y}`).join(" L ")}` : "",
    };
  });
  const areaCoordinates = points.map((_, index) => ({
    x: xPositions[index],
    y: Math.min(...seriesPaths.map((item) => item.coordinates[index]?.y ?? chartPadding.top + chartInnerHeight)),
  }));
  const areaPath = areaCoordinates.length > 1
    ? `M ${areaCoordinates[0].x} ${chartPadding.top + chartInnerHeight} L ${areaCoordinates.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${areaCoordinates[areaCoordinates.length - 1].x} ${chartPadding.top + chartInnerHeight} Z`
    : "";
  const activeIndex = hoveredIndex;
  const activePoint = activeIndex !== null ? (points[activeIndex] ?? null) : null;
  const activeX = activeIndex !== null ? (xPositions[activeIndex] ?? null) : null;
  const yAxisValues = Array.from(new Set([scaleMax, Math.round(scaleMax / 2), 0])).sort((a, b) => b - a);
  const xAxisIndices = Array.from(new Set([0, Math.max(0, Math.floor((xPositions.length - 1) / 2)), Math.max(0, xPositions.length - 1)]));
  const hoverZones = xPositions.map((x, index) => {
    const left = index === 0 ? chartPadding.left : (xPositions[index - 1] + x) / 2;
    const right = index === xPositions.length - 1 ? chartWidth - chartPadding.right : (x + xPositions[index + 1]) / 2;
    return { index, x: left, width: right - left };
  });
  const footerValues = series.map((item) => ({
    ...item,
    value: activePoint ? getTrendValue(activePoint, item.key) : sumTrendMetric(points, item.key),
  }));

  return (
    <S.Panel>
      <S.PanelHeader>
        <S.PanelHeaderText>
          <S.PanelEyebrow>{eyebrow}</S.PanelEyebrow>
          <S.PanelTitle>{title}</S.PanelTitle>
          <S.PanelSubtitle>{subtitle}</S.PanelSubtitle>
        </S.PanelHeaderText>
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
                const coordinate = activeIndex !== null ? (item.coordinates[activeIndex] ?? null) : null;
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
                const point = points[index];
                const x = xPositions[index];

                if (!point || x === undefined) return null;

                return (
                  <text key={`${point.bucket_start}-${index}`} x={x} y={chartHeight - 10} fill={theme.textMuted} fontSize="12" fontWeight="700" textAnchor="middle">
                    {formatBucketAxisLabel(point.bucket_start, granularity)}
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
        <span>{activePoint ? formatBucketDetailLabel(activePoint.bucket_start, granularity) : (hasData ? overallLabel : emptyLabel)}</span>
        {hasData ? (
          <S.TrendFooterValues>
            {footerValues.map((item) => (
              <S.TrendFooterValue key={`${item.key}-footer`}>
                <S.TrendLegendDot $color={item.color} />
                <span>{item.label}</span>
                <strong>{formatCount(item.value)}</strong>
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
  const [selectedPeriod, setSelectedPeriod] = useState<ProjectStatsPeriodKey>("total");
  const [activeHeatmapKey, setActiveHeatmapKey] = useState<string | null>(null);

  const periodStats = stats?.periods[selectedPeriod] ?? null;
  const periodLabel = t(`analytics.periods.${selectedPeriod}`);
  const periodScopeLabel = t(`analytics.periodScopes.${selectedPeriod}`);
  const trendOverallLabel = selectedPeriod === "total" ? t("analytics.trend.overall") : t("analytics.trend.overallInPeriod", { period: periodLabel });
  const interactionShare = (periodStats?.shares.interaction_types ?? []).map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }));
  const originShare = (periodStats?.shares.message_origins ?? []).map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }));
  const dietShare = (periodStats?.shares.diet_filters ?? [])
    .map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }))
    .sort((left, right) => {
      const order: Record<string, number> = { vegetarian: 0, vegan: 1, meat: 2, none: 3 };
      return (order[left.id] ?? 99) - (order[right.id] ?? 99);
    });
  const trendPoints = periodStats?.trend.points ?? [];
  const trendGranularity = periodStats?.trend.granularity ?? "day";
  const heatmap = periodStats?.heatmap ?? [];
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

  const primaryCards = periodStats ? [
    {
      id: "active-users",
      icon: <AboutUsIcon />,
      label: t("analytics.kpis.activeUsers"),
      value: formatCompact(periodStats.summary.active_users),
      meta: t("analytics.kpiMeta.activeUsers", { period: periodLabel }),
    },
    {
      id: "messages",
      icon: <ChatIcon />,
      label: t("analytics.kpis.messages"),
      value: formatCompact(periodStats.summary.messages),
      meta: t("analytics.kpiMeta.messages", { llm: formatCompact(totalLlmMessages), quick: formatCompact(totalQuickLookupMessages), period: periodScopeLabel }),
    },
    {
      id: "sessions",
      icon: <AnalyticsIcon />,
      label: t("analytics.kpis.sessions"),
      value: formatCompact(periodStats.summary.sessions),
      meta: t("analytics.kpiMeta.sessions", { period: periodLabel }),
    },
    {
      id: "tool-calls",
      icon: <MCPIcon />,
      label: t("analytics.kpis.toolCalls"),
      value: formatCompact(periodStats.summary.tool_calls),
      meta: t("analytics.kpiMeta.toolCalls", { value: formatPercent(periodStats.summary.tool_success_rate), period: periodScopeLabel }),
    },
    {
      id: "active-chats",
      icon: <ChatIcon />,
      label: t("analytics.kpis.activeChats"),
      value: formatCompact(periodStats.summary.active_chats),
      meta: t("analytics.kpiMeta.activeChats", { period: periodLabel }),
    },
    {
      id: "canteens-explored",
      icon: <MensenIcon />,
      label: t("analytics.kpis.canteensExplored"),
      value: formatCompact(periodStats.summary.distinct_canteens),
      meta: t("analytics.kpiMeta.canteensExplored", { period: periodLabel }),
    },
  ] : [];

  const secondaryCards: InsightCard[] = periodStats ? [
    {
      id: "cities-explored",
      icon: <CitiesIcon />,
      value: formatCompact(periodStats.summary.distinct_cities),
      title: t("analytics.kpis.citiesExplored"),
      meta: t("analytics.kpiMeta.citiesExplored", { period: periodLabel }),
    },
    {
      id: "voice-requests",
      icon: <MicrophoneIcon width="24" height="24" />,
      value: formatCompact(periodStats.summary.transcribe_requests),
      title: t("analytics.kpis.transcribe"),
      meta: t("analytics.kpiMeta.voiceRequests", { period: periodLabel }),
    },
    {
      id: "shortcut-starts",
      icon: <ShortcutsIcon />,
      value: formatCompact(periodStats.summary.shortcut_messages),
      title: t("analytics.kpis.shortcuts"),
      meta: t("analytics.kpiMeta.shortcuts", { period: periodLabel }),
    },
    {
      id: "avg-tool-calls-per-llm-turn",
      icon: <MCPIcon />,
      value: formatDecimal(periodStats.summary.average_tool_calls_per_llm_turn),
      title: t("analytics.kpis.avgToolCallsPerLlmTurn"),
      meta: t("analytics.kpiMeta.toolSuccessRateInline", {
        value: formatPercent(periodStats.summary.tool_success_rate),
        period: periodScopeLabel,
      }),
    },
    {
      id: "avg-messages-per-session",
      icon: <AnalyticsIcon />,
      value: formatDecimal(periodStats.summary.average_messages_per_session),
      title: t("analytics.kpis.avgMessagesPerSession"),
      meta: t("analytics.kpiMeta.avgMessagesPerSession", { period: periodScopeLabel }),
    },
    {
      id: "canteen-coverage",
      icon: <AboutUsIcon />,
      value: formatPercent(stats && stats.availability.total_canteens > 0 ? periodStats.summary.distinct_canteens / stats.availability.total_canteens : 0),
      title: t("analytics.kpis.canteenCoverage"),
      meta: t("analytics.kpiMeta.canteenCoverage", { total: formatCount(stats?.availability.total_canteens ?? 0) }),
    },
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
        <P.HeroCard>
          <P.HeroEyebrow>{t("analytics.eyebrow")}</P.HeroEyebrow>
          <P.HeroTitle>{t("analytics.title")}</P.HeroTitle>
          <P.HeroSubtitle>{t("analytics.subtitle")}</P.HeroSubtitle>
          {stats ? (
            <S.ControlRow>
              {PERIOD_KEYS.map((periodKey) => (
                <S.SegmentedButton key={periodKey} type="button" $active={selectedPeriod === periodKey} $tone="red" onClick={() => setSelectedPeriod(periodKey)}>
                  {t(`analytics.periods.${periodKey}`)}
                </S.SegmentedButton>
              ))}
            </S.ControlRow>
          ) : null}
          <S.HeroMeta>
            {stats
              ? t("analytics.context", { period: periodLabel, updated: formatDateTime(stats.updated_at), timezone: stats.timezone })
              : t("analytics.heroMeta")}
          </S.HeroMeta>
        </P.HeroCard>
      </S.HeroGrid>

      {statusCard}

      {stats && periodStats ? (
        <S.DashboardGrid>
          <S.KPIGrid>
            {primaryCards.map((card, index) => (
              <FeatureCard
                key={card.id}
                delay={index}
                density="compact"
                valueMode="compact"
                icon={card.icon}
                eyebrow={card.label}
                value={card.value}
                meta={card.meta}
              />
            ))}
          </S.KPIGrid>

          <S.TrendColumn>
            <TrendPanel
              eyebrow={t("analytics.trend.reach.eyebrow")}
              title={t("analytics.trend.reach.title")}
              subtitle={t("analytics.trend.reach.subtitle", { period: periodLabel })}
              ariaLabel={t("analytics.trend.reach.ariaLabel")}
              emptyLabel={t("analytics.trend.empty")}
              overallLabel={trendOverallLabel}
              points={trendPoints}
              granularity={trendGranularity}
              series={reachSeries}
            />
            <TrendPanel
              eyebrow={t("analytics.trend.behavior.eyebrow")}
              title={t("analytics.trend.behavior.title")}
              subtitle={t("analytics.trend.behavior.subtitle", { period: periodLabel })}
              ariaLabel={t("analytics.trend.behavior.ariaLabel")}
              emptyLabel={t("analytics.trend.empty")}
              overallLabel={trendOverallLabel}
              points={trendPoints}
              granularity={trendGranularity}
              series={behaviorSeries}
            />
          </S.TrendColumn>

          <S.Panel>
            <S.PanelHeader>
              <S.PanelHeaderText>
                <S.PanelEyebrow>{t("analytics.heatmap.eyebrow")}</S.PanelEyebrow>
                <S.PanelTitle>{t("analytics.heatmap.title")}</S.PanelTitle>
                <S.PanelSubtitle>{t("analytics.heatmap.subtitle", { period: periodLabel, timezone: stats.timezone })}</S.PanelSubtitle>
              </S.PanelHeaderText>
            </S.PanelHeader>
            <S.HeatmapLayout>
              <S.HeatmapMeta>
                <S.HeatmapTooltip>
                  <strong>{t("analytics.heatmap.selectedSlot")}</strong>
                  <br />
                  {weekdayLabels[selectedHeatmapCell.weekday]} · {formatHourRange(selectedHeatmapCell.hour)}
                  <br />
                  {t("analytics.heatmap.tooltip", { value: formatCount(selectedHeatmapCell.count) })}
                </S.HeatmapTooltip>
                <S.HeatmapTooltip>
                  <strong>{t("analytics.heatmap.peakSlot")}</strong>
                  <br />
                  {peakSlotValue}
                  <br />
                  {peakHeatmapCell.count > 0 ? t("analytics.heatmap.tooltip", { value: formatCount(peakHeatmapCell.count) }) : t("analytics.trend.empty")}
                </S.HeatmapTooltip>
              </S.HeatmapMeta>
              <S.HeatmapGridWrap onMouseLeave={() => setActiveHeatmapKey(null)}>
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
                            type="button"
                            $active={isActive}
                            style={{ background }}
                            aria-label={t("analytics.heatmap.cellAriaLabel", {
                              weekday: label,
                              hour: formatHourRange(hour),
                              value: formatCount(cell.count),
                              timezone: stats.timezone,
                              period: periodLabel,
                            })}
                            aria-pressed={isActive}
                            onMouseEnter={() => setActiveHeatmapKey(`${weekday}-${hour}`)}
                            onFocus={() => setActiveHeatmapKey(`${weekday}-${hour}`)}
                            onBlur={() => setActiveHeatmapKey(null)}
                            onClick={() => setActiveHeatmapKey(`${weekday}-${hour}`)}
                          />
                        );
                      })}
                    </S.HeatmapRow>
                  ))}
                </S.HeatmapMatrix>
              </S.HeatmapGridWrap>
            </S.HeatmapLayout>
          </S.Panel>

          <S.ShareGrid>
            <ShareCard
              title={t("analytics.share.interactions.title")}
              subtitle={t("analytics.share.interactions.subtitle", { period: periodLabel })}
              items={interactionShare}
              colors={[theme.accent1, theme.accent3]}
              totalLabel={t("analytics.share.interactions.total")}
            />
            <ShareCard
              title={t("analytics.share.origins.title")}
              subtitle={t("analytics.share.origins.subtitle", { period: periodLabel })}
              items={originShare}
              colors={[theme.accent1, theme.accent2, theme.accent3]}
              totalLabel={t("analytics.share.origins.total")}
            />
            <ShareCard
              title={t("analytics.share.diets.title")}
              subtitle={t("analytics.share.diets.subtitle", { period: periodLabel })}
              items={dietShare}
              colors={[theme.accent1, theme.accent2, theme.accent3, theme.textMuted]}
              totalLabel={t("analytics.share.diets.total")}
            />
          </S.ShareGrid>

          <S.LeaderboardGrid>
            <LeaderboardCard title={t("analytics.leaderboards.cities.eyebrow")} subtitle={t("analytics.leaderboards.cities.title", { period: periodLabel })} entries={periodStats.leaderboards.cities} emptyLabel={t("analytics.leaderboards.empty")} />
            <LeaderboardCard title={t("analytics.leaderboards.canteens.eyebrow")} subtitle={t("analytics.leaderboards.canteens.title", { period: periodLabel })} entries={periodStats.leaderboards.canteens} emptyLabel={t("analytics.leaderboards.empty")} formatHint={(entry) => entry.city ?? null} />
            <LeaderboardCard title={t("analytics.leaderboards.tools.eyebrow")} subtitle={t("analytics.leaderboards.tools.title", { period: periodLabel })} entries={periodStats.leaderboards.tools} emptyLabel={t("analytics.leaderboards.empty")} formatLabel={getToolLabel} />
            <LeaderboardCard title={t("analytics.leaderboards.filters.eyebrow")} subtitle={t("analytics.leaderboards.filters.title", { period: periodLabel })} entries={periodStats.leaderboards.filters} emptyLabel={t("analytics.leaderboards.empty")} formatLabel={(entry) => getFilterLabel(entry, t)} />
          </S.LeaderboardGrid>

          <S.InsightGrid>
            {secondaryCards.map((card, index) => (
              <FeatureCard
                key={card.id}
                delay={index}
                density="compact"
                valueMode="compact"
                icon={card.icon}
                value={card.value}
                title={card.title}
                meta={card.meta}
                description={card.description}
              />
            ))}
          </S.InsightGrid>
        </S.DashboardGrid>
      ) : null}
    </S.PageContainer>
  );
};

export default AnalyticsPage;
