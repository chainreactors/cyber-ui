import chroma from 'chroma-js';

interface ColorConfig {
  saturation: number;
  lightness: number;
  minContrast: number;
  goldenAngle: number;
}

export interface ColorQuality {
  hex: string;
  hsl: number[];
  contrastWhite: number;
  contrastBlack: number;
  isAccessible: boolean;
  wcagRating: string;
}

export class ColorManager {
  colorConfig: ColorConfig;
  basePalette: string[];
  nodeTypeColors: Map<string, string>;
  edgeTypeColors: Map<string, string>;
  severityLevelColors: Record<string, string>;
  dynamicColors: Map<string, string>;

  constructor() {
    this.colorConfig = {
      saturation: 85,
      lightness: 55,
      minContrast: 4.5,
      goldenAngle: 137.508,
    };

    this.basePalette = this.generateModernPalette();

    this.nodeTypeColors = new Map();
    this.edgeTypeColors = new Map();

    this.severityLevelColors = {
      critical: '#ff3b82',
      high: '#ff6b35',
      medium: '#ffd23f',
      low: '#00d9ff',
      info: '#8b5cf6',
      unknown: '#06d6a0',
    };

    this.dynamicColors = new Map();
  }

  /**
   * Generate a modern bright palette.
   * 24 hand-picked colors followed by golden-angle generated extras.
   */
  generateModernPalette(): string[] {
    const colors: string[] = [];
    const { saturation, lightness, goldenAngle } = this.colorConfig;

    const curatedColors = [
      '#ff6b9d',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#feca57',
      '#ff9ff3',
      '#54a0ff',
      '#5f27cd',
      '#00d2d3',
      '#ff9f43',
      '#ee5a6f',
      '#c44569',
      '#40407a',
      '#706fd3',
      '#f8b500',
      '#3742fa',
      '#2f3542',
      '#ff3838',
      '#2ed573',
      '#ffa502',
      '#6c5ce7',
      '#a55eea',
      '#26de81',
      '#fd79a8',
    ];

    for (let i = 0; i < 32; i++) {
      const hue = (i * goldenAngle) % 360;

      let adjustedSaturation = saturation;
      let adjustedLightness = lightness;

      if (hue >= 30 && hue <= 90) {
        adjustedSaturation = 90;
        adjustedLightness = 50;
      } else if (hue >= 180 && hue <= 240) {
        adjustedSaturation = 85;
        adjustedLightness = 58;
      } else if (hue >= 270 && hue <= 330) {
        adjustedSaturation = 88;
        adjustedLightness = 60;
      } else {
        adjustedSaturation = 85;
        adjustedLightness = 55;
      }

      const color = chroma.hsl(hue, adjustedSaturation / 100, adjustedLightness / 100);

      if (chroma.contrast(color, '#ffffff') >= 3.0) {
        colors.push(color.hex());
      }
    }

    return [...curatedColors, ...colors];
  }

  /** Get a color for a node type (sequential from palette). */
  getNodeTypeColor(nodeType: string): string {
    const normalized = nodeType?.toLowerCase() ?? 'default';

    const existing = this.nodeTypeColors.get(normalized);
    if (existing) return existing;

    const index = this.nodeTypeColors.size % this.basePalette.length;
    const color = this.basePalette[index];
    this.nodeTypeColors.set(normalized, color);
    return color;
  }

  /** Get a color for an edge type (separate pool, avoids node colors). */
  getEdgeTypeColor(edgeType: string): string {
    const normalized = edgeType?.toUpperCase() ?? 'DEFAULT';

    const existing = this.edgeTypeColors.get(normalized);
    if (existing) return existing;

    const usedColors = [...this.nodeTypeColors.values(), ...this.edgeTypeColors.values()];
    const color = this.generateDynamicColor(normalized, usedColors);
    this.edgeTypeColors.set(normalized, color);
    return color;
  }

  /** Get a severity-level color. */
  getSeverityLevelColor(severityLevel: string): string {
    const normalized = severityLevel?.toLowerCase() ?? 'unknown';
    return this.severityLevelColors[normalized] ?? this.severityLevelColors['unknown'];
  }

  /**
   * Dynamically generate a color for an arbitrary key,
   * picking from the palette first, then falling back to smart generation.
   */
  generateDynamicColor(key: string, existingColors: string[] = []): string {
    const existing = this.dynamicColors.get(key);
    if (existing) return existing;

    const available = this.basePalette.filter((c) => !existingColors.includes(c));

    let selected: string;
    if (available.length > 0) {
      const hash = this._hashString(key);
      selected = available[hash % available.length];
    } else {
      selected = this._generateSmartColor(key, existingColors);
    }

    this.dynamicColors.set(key, selected);
    return selected;
  }

  /**
   * Convenience: build a `{ type: color }` map for a list of types.
   * @param category - 'node' | 'edge' | 'severity'
   */
  getTypeColorMap(types: string[], category: string = 'node'): Record<string, string> {
    const map: Record<string, string> = {};
    for (const type of types) {
      switch (category) {
        case 'edge':
          map[type] = this.getEdgeTypeColor(type);
          break;
        case 'severity':
          map[type] = this.getSeverityLevelColor(type);
          break;
        case 'node':
        default:
          map[type] = this.getNodeTypeColor(type);
      }
    }
    return map;
  }

  /** Generate a gradient array from a base color. */
  generateGradient(baseColor: string, steps: number = 5): string[] {
    const lighter = chroma(baseColor).brighten(1.5).hex();
    const darker = chroma(baseColor).darken(1).hex();
    return chroma.scale([lighter, baseColor, darker]).mode('hsl').colors(steps);
  }

  /** Convert a color to an rgba() CSS string. */
  toRgba(color: string, alpha: number = 1): string {
    return chroma(color).alpha(alpha).css();
  }

  /** Return 'white' or 'black' for readable text on the given background. */
  getContrastTextColor(bgColor: string): string {
    return chroma.contrast(bgColor, 'white') > 4.5 ? 'white' : 'black';
  }

  /** Get a color for a fingerprint signal type (device/vpn/firewall/waf/info). */
  getSignalTypeColor(signalType: string): string | null {
    const map: Record<string, string> = {
      device: '#ff6b35',
      vpn: '#8b5cf6',
      firewall: '#ff3b82',
      waf: '#ee5a6f',
      info: '#feca57',
    };
    return map[signalType?.toLowerCase()] ?? null;
  }

  /** Get WCAG contrast and accessibility info for a color. */
  getColorQuality(color: string): ColorQuality | null {
    try {
      const chromaColor = chroma(color);
      const contrastWhite = chroma.contrast(chromaColor, '#ffffff');
      const contrastBlack = chroma.contrast(chromaColor, '#000000');
      return {
        hex: chromaColor.hex(),
        hsl: chromaColor.hsl(),
        contrastWhite: Math.round(contrastWhite * 100) / 100,
        contrastBlack: Math.round(contrastBlack * 100) / 100,
        isAccessible: contrastWhite >= this.colorConfig.minContrast,
        wcagRating: contrastWhite >= 7 ? 'AAA' : contrastWhite >= 4.5 ? 'AA' : 'Fail',
      };
    } catch {
      return null;
    }
  }

  /** Diagnostic: inspect all palettes with quality info. */
  previewPalette() {
    return {
      basePalette: this.basePalette.map((c) => this.getColorQuality(c)),
      nodeTypes: Object.fromEntries(
        Array.from(this.nodeTypeColors.entries()).map(([type, color]) => [type, this.getColorQuality(color)]),
      ),
      edgeTypes: Object.fromEntries(
        Array.from(this.edgeTypeColors.entries()).map(([type, color]) => [type, this.getColorQuality(color)]),
      ),
      severityLevels: Object.fromEntries(
        Object.entries(this.severityLevelColors).map(([level, color]) => [level, this.getColorQuality(color)]),
      ),
      stats: {
        totalColors: this.basePalette.length,
        assignedNodeTypes: this.nodeTypeColors.size,
        assignedEdgeTypes: this.edgeTypeColors.size,
        accessibleColors: this.basePalette.filter(
          (color) => chroma.contrast(chroma(color), '#ffffff') >= this.colorConfig.minContrast,
        ).length,
      },
    };
  }

  /** Serialize current color state for theme switching. */
  exportColorConfig() {
    return {
      nodeTypeColors: Object.fromEntries(this.nodeTypeColors),
      edgeTypeColors: Object.fromEntries(this.edgeTypeColors),
      severityLevelColors: { ...this.severityLevelColors },
      basePalette: [...this.basePalette],
    };
  }

  /** Restore color state from a previously exported config. */
  importColorConfig(config: Partial<ReturnType<ColorManager['exportColorConfig']>>): void {
    if (config.nodeTypeColors) this.nodeTypeColors = new Map(Object.entries(config.nodeTypeColors));
    if (config.edgeTypeColors) this.edgeTypeColors = new Map(Object.entries(config.edgeTypeColors));
    if (config.severityLevelColors) this.severityLevelColors = { ...config.severityLevelColors };
    if (config.basePalette) this.basePalette = [...config.basePalette];
    this.clearDynamicColors();
  }

  /** Reset all dynamic color caches. */
  clearDynamicColors(): void {
    this.dynamicColors.clear();
    this.nodeTypeColors.clear();
    this.edgeTypeColors.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Simple string hash (djb2-style). */
  private _hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Smart color generation with deltaE distance check against existing colors.
   */
  private _generateSmartColor(key: string, existingColors: string[]): string {
    const hash = this._hashString(key);
    const { saturation, lightness, goldenAngle, minContrast } = this.colorConfig;

    let hue = (hash * goldenAngle) % 360;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let adjSat = saturation + attempts * 5;
      let adjLit = lightness;

      if (hue >= 40 && hue <= 70) {
        adjLit = 40 - attempts * 2;
        adjSat = Math.min(90, adjSat);
      } else if (hue >= 290 && hue <= 320) {
        adjLit = 60 + attempts * 2;
      }

      adjSat = Math.min(95, Math.max(60, adjSat));
      adjLit = Math.min(70, Math.max(30, adjLit));

      const color = chroma.hsl(hue, adjSat / 100, adjLit / 100);
      const colorHex = color.hex();

      const hasGoodContrast = chroma.contrast(color, '#ffffff') >= minContrast;
      const isDifferent =
        existingColors.length === 0 ||
        existingColors.every((ec) => {
          try {
            return chroma.deltaE(color, chroma(ec)) > 15;
          } catch {
            return true;
          }
        });

      if (hasGoodContrast && isDifferent) {
        return colorHex;
      }

      hue = (hue + 30 + attempts * 15) % 360;
      attempts++;
    }

    return this._generateHSLColor(key);
  }

  /** Fallback HSL color from hash. */
  private _generateHSLColor(key: string): string {
    const hash = this._hashString(key);
    const hue = hash % 360;
    const sat = 60 + (hash % 30);
    const lit = 45 + (hash % 20);
    return chroma.hsl(hue, sat / 100, lit / 100).hex();
  }
}

/** Default singleton instance. */
export const defaultColorManager = new ColorManager();

// Convenience functions bound to the default instance
export const getNodeColor = (nodeType: string): string =>
  defaultColorManager.getNodeTypeColor(nodeType);

export const getEdgeColor = (edgeType: string): string =>
  defaultColorManager.getEdgeTypeColor(edgeType);

export const getSeverityColor = (severityLevel: string): string =>
  defaultColorManager.getSeverityLevelColor(severityLevel);

export const generateTypeColorMap = (types: string[], category?: string): Record<string, string> =>
  defaultColorManager.getTypeColorMap(types, category);

export const getSignalColor = (signalType: string): string | null =>
  defaultColorManager.getSignalTypeColor(signalType);
