import { describe, expect, it } from 'vitest';
import { CSTX_FLAGS, hasCstxFlag } from './cstxFlags';

describe('hasCstxFlag', () => {
  it('accepts lightweight rows with top-level flags', () => {
    expect(hasCstxFlag(
      { cstx_flags: CSTX_FLAGS.FALSE_POSITIVE },
      CSTX_FLAGS.FALSE_POSITIVE,
    )).toBe(true);
  });

  it('accepts generated nodes with flags under extras', () => {
    expect(hasCstxFlag(
      { extras: { cstx_flags: CSTX_FLAGS.THREAT_PRESENT } },
      CSTX_FLAGS.THREAT_PRESENT,
    )).toBe(true);
  });
});
