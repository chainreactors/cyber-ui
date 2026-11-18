import { describe, expect, it } from 'vitest';
import { LUCIDE_ICONS, resolveLucideIcon } from './lucideIcon';

describe('resolveLucideIcon', () => {
  it('resolves the names the app and the manifests use', () => {
    // MessageSquare is the asset panel's send-to-chat action, Check the mention
    // picker's insert action, Server and Shield the stat card's documented examples.
    for (const name of ['MessageSquare', 'Check', 'Server', 'Shield']) {
      expect(resolveLucideIcon(name), name).toBe(LUCIDE_ICONS[name]);
      expect(resolveLucideIcon(name), name).not.toBeNull();
    }
  });

  it('returns nothing for a name outside the supported set', () => {
    expect(resolveLucideIcon('NotAnIcon')).toBeNull();
    expect(resolveLucideIcon('server')).toBeNull();
  });

  it('returns nothing for a missing name', () => {
    expect(resolveLucideIcon(undefined)).toBeNull();
    expect(resolveLucideIcon(null)).toBeNull();
    expect(resolveLucideIcon('')).toBeNull();
  });
});
