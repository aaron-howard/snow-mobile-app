import { contrastRatio, parseHex, relativeLuminance } from '../contrast';

describe('contrast utilities', () => {
  test('white on black is the maximum 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });

  test('identical colors are 1:1', () => {
    expect(contrastRatio('#3B82F6', '#3B82F6')).toBeCloseTo(1, 5);
  });

  test('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#123456', '#abcdef')).toBeCloseTo(
      contrastRatio('#abcdef', '#123456'),
      10,
    );
  });

  test('supports shorthand hex', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(relativeLuminance('#000')).toBeCloseTo(0, 10);
  });

  test('rejects malformed hex', () => {
    expect(() => parseHex('#12')).toThrow();
    expect(() => parseHex('#ggreen')).toThrow();
  });
});
