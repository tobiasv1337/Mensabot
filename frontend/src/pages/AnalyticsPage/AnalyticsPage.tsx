import React, { useState } from "react";
import { useAppShellContext } from "@/layouts/AppShell/useAppShellContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type { ProjectStatsLeaderboardEntry, ProjectStatsShare, ProjectStatsTrendPoint } from "@/shared/api/MensaBotClient";
import { Button } from "@/shared/ui/button/Button";
import { AboutUsIcon, CitiesIcon, GitHubIcon, GraduationCapIcon, MCPIcon, MensenIcon, OpenSourceIcon, ShortcutsIcon, StarIcon } from "@/shared/ui/icons";
import * as P from "@/shared/ui/page/PageHero.styles";
import * as S from "./AnalyticsPage.styles";
import { useAnalyticsStats } from "./useAnalyticsStats";


type TrendMetricKey = "messages" | "llm_messages" | "quick_lookup_messages" | "tool_calls" | "transcribe_requests";
type TrendRangeKey = "7" | "30" | "all";
type SegmentTone = "red" | "orange" | "yellow" | "neutral";

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

const numberFormatter = new Intl.NumberFormat();
const compactFormatter = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden>
    <path d="M480-480q33 0 56.5-23.5T560-560v-240q0-33-23.5-56.5T480-880q-33 0-56.5 23.5T400-800v240q0 33 23.5 56.5T480-480Zm-40 320v-84q-93-12-156.5-80.5T216-480h80q0 77 53.5 130.5T480-296q77 0 130.5-53.5T664-480h80q0 87-59.5 155.5T520-244v84h-80Z" />
  </svg>
);

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

const getTrendValue = (point: ProjectStatsTrendPoint, key: TrendMetricKey) => point[key];

const getShareLabel = (id: string, fallback: string, t: ReturnType<typeof useTranslation>["t"]) => {
  if (id === "llm_chat") return t("analytics.labels.llmChat");
  if (id === "quick_lookup") return t("analytics.labels.quickLookup");
  if (id === "typed") return t("analytics.labels.typed");
  if (id === "voice") return t("analytics.labels.voice");
  if (id === "shortcut") return t("analytics.labels.shortcut");
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
          {entries.map((entry) => (
            <S.LeaderboardRow key={entry.key}>
              <S.LeaderboardTop>
                <S.LeaderboardLabelWrap>
                  <S.LeaderboardLabel>{formatLabel ? formatLabel(entry) : entry.label}</S.LeaderboardLabel>
                  {formatHint?.(entry) ? <S.LeaderboardHint>{formatHint(entry)}</S.LeaderboardHint> : null}
                </S.LeaderboardLabelWrap>
                <S.LeaderboardValue>{formatCount(entry.count)}</S.LeaderboardValue>
              </S.LeaderboardTop>
              <S.LeaderboardTrack>
                <S.LeaderboardFill $width={(entry.count / maxCount) * 100} />
              </S.LeaderboardTrack>
            </S.LeaderboardRow>
          ))}
        </S.LeaderboardList>
      ) : (
        <S.EmptyState>{emptyLabel}</S.EmptyState>
      )}
    </S.LeaderboardCard>
  );
};

const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isOffline } = useAppShellContext();
  const theme = useTheme();
  const { stats, isLoading, error } = useAnalyticsStats(isOffline);
  const [trendMetric, setTrendMetric] = useState<TrendMetricKey>("messages");
  const [trendRange, setTrendRange] = useState<TrendRangeKey>("30");
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [activeHeatmapKey, setActiveHeatmapKey] = useState<string | null>(null);

  const facts = [
    {
      id: "student",
      icon: <GraduationCapIcon />,
      title: t("analytics.facts.studentProject.title"),
      description: t("analytics.facts.studentProject.description"),
    },
    {
      id: "mcp",
      icon: <MCPIcon />,
      title: t("analytics.facts.mcp.title"),
      description: t("analytics.facts.mcp.description"),
    },
    {
      id: "oss",
      icon: <OpenSourceIcon />,
      title: t("analytics.facts.openSource.title"),
      description: t("analytics.facts.openSource.description"),
      action: {
        icon: <GitHubIcon />,
        label: t("analytics.githubButton"),
        href: "https://github.com/tobiasv1337/Mensabot",
      },
    },
    {
      id: "speed",
      icon: <ShortcutsIcon />,
      title: t("analytics.facts.fastReliable.title"),
      description: t("analytics.facts.fastReliable.description"),
    },
  ];

  const interactionShare = (stats?.shares.interaction_types ?? []).map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }));
  const originShare = (stats?.shares.message_origins ?? []).map((item) => ({ ...item, label: getShareLabel(item.id, item.label, t) }));
  const trendMetricOptions = [
    { key: "messages" as const, label: t("analytics.trend.controls.messages"), color: theme.accent1, tone: "red" as SegmentTone },
    { key: "llm_messages" as const, label: t("analytics.trend.controls.llm"), color: theme.accent2, tone: "orange" as SegmentTone },
    { key: "quick_lookup_messages" as const, label: t("analytics.trend.controls.quickLookup"), color: theme.accent3, tone: "yellow" as SegmentTone },
    { key: "tool_calls" as const, label: t("analytics.trend.controls.tools"), color: theme.accent1, tone: "red" as SegmentTone },
    { key: "transcribe_requests" as const, label: t("analytics.trend.controls.voice"), color: theme.accent2, tone: "orange" as SegmentTone },
  ];
  const trendPoints = stats?.trend.points ?? [];
  const visibleTrendPoints = trendRange === "all" ? trendPoints : trendPoints.slice(-Number(trendRange));
  const activeTrendOption = trendMetricOptions.find((option) => option.key === trendMetric) ?? trendMetricOptions[0];
  const trendTotal = sumTrendMetric(visibleTrendPoints, trendMetric);
  const trendHasData = visibleTrendPoints.some((point) => getTrendValue(point, trendMetric) > 0);
  const activeTrendPoint = visibleTrendPoints[hoveredTrendIndex ?? visibleTrendPoints.length - 1] ?? null;
  const trendMax = trendHasData ? Math.max(...visibleTrendPoints.map((point) => getTrendValue(point, trendMetric))) : 0;
  const trendScaleMax = trendMax > 0 ? trendMax : 1;
  const chartWidth = 760;
  const chartHeight = 280;
  const chartPadding = { top: 18, right: 14, bottom: 34, left: 10 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartPoints = visibleTrendPoints.map((point, index) => {
    const x = chartPadding.left + (visibleTrendPoints.length <= 1 ? chartInnerWidth / 2 : (index / (visibleTrendPoints.length - 1)) * chartInnerWidth);
    const y = chartPadding.top + chartInnerHeight - (getTrendValue(point, trendMetric) / trendScaleMax) * chartInnerHeight;
    return { point, x, y };
  });
  const linePath = chartPoints.length > 1 ? `M ${chartPoints.map((point) => `${point.x} ${point.y}`).join(" L ")}` : "";
  const areaPath = chartPoints.length > 1 ? `M ${chartPoints[0].x} ${chartPadding.top + chartInnerHeight} L ${chartPoints.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${chartPoints[chartPoints.length - 1].x} ${chartPadding.top + chartInnerHeight} Z` : "";
  const singleTrendPoint = chartPoints.length === 1 ? chartPoints[0] : null;
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

  const kpis = stats ? [
    {
      id: "messages",
      label: t("analytics.kpis.messages"),
      value: formatCompact(stats.headline.messages_total),
      meta: t("analytics.kpiMeta.messages", { llm: formatCompact(totalLlmMessages), quick: formatCompact(totalQuickLookupMessages) }),
    },
    {
      id: "users",
      label: t("analytics.kpis.users"),
      value: formatCompact(stats.headline.users_total),
      meta: t("analytics.kpiMeta.users", { value: formatCompact(stats.headline.active_users_30d) }),
    },
    {
      id: "sessions",
      label: t("analytics.kpis.sessions"),
      value: formatCompact(stats.headline.sessions_total),
      meta: t("analytics.kpiMeta.sessions", { value: formatDecimal(stats.headline.average_messages_per_session) }),
    },
    {
      id: "chats",
      label: t("analytics.kpis.chats"),
      value: formatCompact(stats.headline.chats_total),
      meta: t("analytics.kpiMeta.chats", { value: formatDecimal(stats.headline.average_canteens_per_user) }),
    },
    {
      id: "tools",
      label: t("analytics.kpis.toolCalls"),
      value: formatCompact(stats.headline.tool_calls_total),
      meta: t("analytics.kpiMeta.tools", { rate: formatPercent(stats.headline.tool_success_rate) }),
    },
    {
      id: "voice",
      label: t("analytics.kpis.transcribe"),
      value: formatCompact(stats.headline.transcribe_requests_total),
      meta: t("analytics.kpiMeta.voice"),
    },
    {
      id: "shortcut",
      label: t("analytics.kpis.shortcuts"),
      value: formatCompact(stats.headline.shortcut_triggered_messages_total),
      meta: t("analytics.kpiMeta.shortcuts"),
    },
  ] : [];

  const heroSignals = stats ? [
    { id: "messages", label: t("analytics.heroSignals.totalMessages"), value: formatCompact(stats.headline.messages_total) },
    { id: "users", label: t("analytics.heroSignals.totalUsers"), value: formatCompact(stats.headline.users_total) },
    { id: "chats", label: t("analytics.heroSignals.totalChats"), value: formatCompact(stats.headline.chats_total) },
    { id: "tools", label: t("analytics.heroSignals.totalToolCalls"), value: formatCompact(stats.headline.tool_calls_total) },
  ] : [];

  const heroBadges = stats ? [
    t("analytics.badges.totalCanteens", { value: formatCount(stats.availability.total_canteens) }),
    peakHeatmapCell.count > 0 ? t("analytics.badges.peakTime", { day: weekdayLabels[peakHeatmapCell.weekday], time: formatHourRange(peakHeatmapCell.hour) }) : null,
  ].filter(Boolean) : [];

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
                <S.HeroBadge key={badge}>{badge}</S.HeroBadge>
              ))}
            </S.HeroBadgeRow>
          ) : null}
          <S.HeroMeta>
            {stats ? t("analytics.updatedAt", { value: formatDateTime(stats.updated_at) }) : t("analytics.heroMeta")}
          </S.HeroMeta>
        </S.HeroContentCard>
        <S.HeroSignalGrid>
          {heroSignals.length > 0 ? heroSignals.map((signal) => (
            <S.HeroSignalCard key={signal.id}>
              <S.HeroSignalValue>{signal.value}</S.HeroSignalValue>
              <S.HeroSignalLabel>{signal.label}</S.HeroSignalLabel>
            </S.HeroSignalCard>
          )) : (
            <>
              <S.HeroSignalCard><S.HeroSignalValue>...</S.HeroSignalValue><S.HeroSignalLabel>{t("analytics.heroSignals.totalMessages")}</S.HeroSignalLabel></S.HeroSignalCard>
              <S.HeroSignalCard><S.HeroSignalValue>...</S.HeroSignalValue><S.HeroSignalLabel>{t("analytics.heroSignals.totalUsers")}</S.HeroSignalLabel></S.HeroSignalCard>
              <S.HeroSignalCard><S.HeroSignalValue>...</S.HeroSignalValue><S.HeroSignalLabel>{t("analytics.heroSignals.totalChats")}</S.HeroSignalLabel></S.HeroSignalCard>
              <S.HeroSignalCard><S.HeroSignalValue>...</S.HeroSignalValue><S.HeroSignalLabel>{t("analytics.heroSignals.totalToolCalls")}</S.HeroSignalLabel></S.HeroSignalCard>
            </>
          )}
        </S.HeroSignalGrid>
      </S.HeroGrid>

      <S.FactGrid>
        {facts.map((fact) => (
          <S.FactCard key={fact.id}>
            <S.FactHeader>
              {fact.icon}
              <S.FactTitle>{fact.title}</S.FactTitle>
            </S.FactHeader>
            <S.FactText>{fact.description}</S.FactText>
            {"action" in fact && fact.action ? (
              <div style={{ marginTop: "1rem" }}>
                <Button variant="default" iconLeft={fact.action.icon} text={fact.action.label} onClick={() => window.open(fact.action.href, "_blank")} />
              </div>
            ) : null}
          </S.FactCard>
        ))}
      </S.FactGrid>

      {statusCard}

      {stats ? (
        <S.DashboardGrid>
          <S.KPIGrid>
            {kpis.map((kpi) => (
              <S.KpiCard key={kpi.id}>
                <S.KpiLabel>{kpi.label}</S.KpiLabel>
                <S.KpiValue>{kpi.value}</S.KpiValue>
                <S.KpiMeta>{kpi.meta}</S.KpiMeta>
              </S.KpiCard>
            ))}
          </S.KPIGrid>

          <S.AnalyticsRow>
            <S.Panel>
              <S.PanelHeader>
                <S.PanelHeaderText>
                  <S.PanelEyebrow>{t("analytics.trend.eyebrow")}</S.PanelEyebrow>
                  <S.PanelTitle>{t("analytics.trend.title")}</S.PanelTitle>
                  <S.PanelSubtitle>{t("analytics.trend.subtitle")}</S.PanelSubtitle>
                </S.PanelHeaderText>
                <S.ControlRow>
                  {trendMetricOptions.map((option) => (
                    <S.SegmentedButton key={option.key} $active={trendMetric === option.key} $tone={option.tone} onClick={() => setTrendMetric(option.key)}>
                      {option.label}
                    </S.SegmentedButton>
                  ))}
                </S.ControlRow>
              </S.PanelHeader>
              <S.ControlRow style={{ marginBottom: "1rem" }}>
                {(["7", "30", "all"] as TrendRangeKey[]).map((range) => (
                  <S.SegmentedButton key={range} $active={trendRange === range} $tone="red" onClick={() => setTrendRange(range)}>
                    {t(`analytics.trend.ranges.${range}`)}
                  </S.SegmentedButton>
                ))}
              </S.ControlRow>
              {trendHasData ? (
                <S.TrendCanvas>
                  <S.TrendCanvasInner>
                    <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={t("analytics.trend.ariaLabel")}>
                      <defs>
                        <linearGradient id="trendStroke" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor={theme.accent1} />
                          <stop offset="60%" stopColor={theme.accent2} />
                          <stop offset="100%" stopColor={theme.accent3} />
                        </linearGradient>
                        <linearGradient id="trendFill" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor={`${activeTrendOption.color}55`} />
                          <stop offset="100%" stopColor={`${activeTrendOption.color}04`} />
                        </linearGradient>
                      </defs>
                      {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                        const y = chartPadding.top + chartInnerHeight * step;
                        return <line key={step} x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke={`${theme.textMuted}22`} strokeDasharray="5 7" />;
                      })}
                      {areaPath ? <path d={areaPath} fill="url(#trendFill)" /> : null}
                      {linePath ? <path d={linePath} fill="none" stroke="url(#trendStroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
                      {singleTrendPoint ? (
                        <rect
                          x={singleTrendPoint.x - 24}
                          y={singleTrendPoint.y}
                          width={48}
                          height={chartPadding.top + chartInnerHeight - singleTrendPoint.y}
                          rx={14}
                          fill={`${activeTrendOption.color}88`}
                        />
                      ) : null}
                      {chartPoints.map((point, index) => (
                        <g key={point.point.date}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={hoveredTrendIndex === index || (hoveredTrendIndex === null && index === chartPoints.length - 1) ? 7 : 5}
                            fill={theme.surfaceCard}
                            stroke={activeTrendOption.color}
                            strokeWidth="3"
                            onMouseEnter={() => setHoveredTrendIndex(index)}
                            onMouseLeave={() => setHoveredTrendIndex(null)}
                          />
                        </g>
                      ))}
                    </svg>
                  </S.TrendCanvasInner>
                </S.TrendCanvas>
              ) : (
                <S.TrendEmptyState>{t("analytics.trend.empty")}</S.TrendEmptyState>
              )}
              <S.TrendFooter>
                <span>{trendHasData && activeTrendPoint ? `${formatDate(activeTrendPoint.date)} · ${formatCount(getTrendValue(activeTrendPoint, trendMetric))} ${activeTrendOption.label}` : t("analytics.trend.empty")}</span>
                <span>{t("analytics.trend.footer", { max: formatCount(trendMax), total: formatCount(trendTotal) })}</span>
              </S.TrendFooter>
            </S.Panel>

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
            <S.InsightCard>
              <div style={{ color: theme.accent1 }}><MensenIcon /></div>
              <S.InsightValue>{getInsightValue(stats.headline.distinct_canteens_total)}</S.InsightValue>
              <S.InsightLabel>{t("analytics.insights.distinctCanteens")}</S.InsightLabel>
            </S.InsightCard>
            <S.InsightCard>
              <div style={{ color: theme.accent2 }}><CitiesIcon /></div>
              <S.InsightValue>{getInsightValue(stats.headline.distinct_cities_total)}</S.InsightValue>
              <S.InsightLabel>{t("analytics.insights.distinctCities")}</S.InsightLabel>
            </S.InsightCard>
            <S.InsightCard>
              <div style={{ color: theme.accent3 }}><AboutUsIcon /></div>
              <S.InsightValue>{getInsightValue(stats.headline.average_canteens_per_user, "decimal")}</S.InsightValue>
              <S.InsightLabel>{t("analytics.insights.averageCanteensPerUser")}</S.InsightLabel>
            </S.InsightCard>
            <S.InsightCard>
              <div style={{ color: theme.accent1 }}><MCPIcon /></div>
              <S.InsightValue>{getInsightValue(stats.headline.average_tools_per_llm_turn, "decimal")}</S.InsightValue>
              <S.InsightLabel>{t("analytics.insights.averageToolsPerTurn")}</S.InsightLabel>
            </S.InsightCard>
            <S.InsightCard>
              <div style={{ color: theme.accent2 }}><MicIcon /></div>
              <S.InsightValue>{getInsightValue(stats.headline.transcribe_requests_total)}</S.InsightValue>
              <S.InsightLabel>{t("analytics.insights.transcribeRequests")}</S.InsightLabel>
            </S.InsightCard>
            <S.InsightCard>
              <div style={{ color: theme.accent3 }}><StarIcon /></div>
              <S.InsightValue>{getInsightValue(stats.headline.tool_success_rate, "percent")}</S.InsightValue>
              <S.InsightLabel>{t("analytics.insights.toolSuccessRate")}</S.InsightLabel>
            </S.InsightCard>
          </S.InsightGrid>
        </S.DashboardGrid>
      ) : null}
    </S.PageContainer>
  );
};

export default AnalyticsPage;
