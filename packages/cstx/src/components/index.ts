import { defaultRegistry } from '../runtime/registry';
import { cstxTableManifest } from './CSTXTable/manifest';
import { CSTXTable } from './CSTXTable/CSTXTable';
import { statCardManifest } from './StatCard/manifest';
import { StatCard } from './StatCard/StatCard';
import { pageHeaderManifest } from './PageHeader/manifest';
import { PageHeader } from './PageHeader/PageHeader';
import { sparklineManifest } from './Sparkline/manifest';
import { Sparkline } from './Sparkline/Sparkline';
import { distributionBarManifest } from './DistributionBar/manifest';
import { DistributionBar } from './DistributionBar/DistributionBar';
import { trendChartManifest } from './TrendChart/manifest';
import { TrendChart } from './TrendChart/TrendChart';
import { barChartManifest } from './BarChart/manifest';
import { BarChart } from './BarChart/BarChart';
import { pieChartManifest } from './PieChart/manifest';
import { PieChart } from './PieChart/PieChart';
import { verticalTimelineManifest } from './VerticalTimeline/manifest';
import { VerticalTimeline } from './VerticalTimeline/VerticalTimeline';

export function registerBuiltins(): void {
  defaultRegistry.register(cstxTableManifest, CSTXTable);
  defaultRegistry.register(statCardManifest, StatCard);
  defaultRegistry.register(pageHeaderManifest, PageHeader);
  defaultRegistry.register(sparklineManifest, Sparkline);
  defaultRegistry.register(distributionBarManifest, DistributionBar);
  defaultRegistry.register(trendChartManifest, TrendChart);
  defaultRegistry.register(barChartManifest, BarChart);
  defaultRegistry.register(pieChartManifest, PieChart);
  defaultRegistry.register(verticalTimelineManifest, VerticalTimeline);
}

export { CSTXTable, cstxTableManifest } from './CSTXTable';
export { StatCard, statCardManifest } from './StatCard';
export { PageHeader, pageHeaderManifest } from './PageHeader';
export { Sparkline, sparklineManifest } from './Sparkline';
export { DistributionBar, distributionBarManifest } from './DistributionBar';
export { TrendChart, trendChartManifest } from './TrendChart';
export { BarChart, barChartManifest } from './BarChart';
export { PieChart, pieChartManifest } from './PieChart';
export { VerticalTimeline, verticalTimelineManifest } from './VerticalTimeline';
