import { defaultRegistry } from '../runtime/registry';
import { cstxTableManifest } from './table/manifest';
import { CSTXTable } from './table/DataTable';
import { statCardManifest } from './chart/statManifest';
import { StatCard } from './chart/Stat';
import { pageHeaderManifest } from './layout/headerManifest';
import { PageHeader } from './layout/Header';
import { sparklineManifest } from './chart/sparklineManifest';
import { Sparkline } from './chart/Sparkline';
import { distributionBarManifest } from './chart/distributionManifest';
import { DistributionBar } from './chart/Distribution';
import { trendChartManifest } from './chart/trendManifest';
import { TrendChart } from './chart/Trend';
import { barChartManifest } from './chart/barManifest';
import { BarChart } from './chart/Bar';
import { pieChartManifest } from './chart/pieManifest';
import { PieChart } from './chart/Pie';
import { verticalTimelineManifest } from './layout/verticalTimelineManifest';
import { VerticalTimeline } from './layout/VerticalTimeline';

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

export * from './chart';
export * from './table';
export * from './timeline';
export * from './search';
export * from './commit';
export * from './graph';
export * from './primitives';
export * from './layout'
export * from './import'
