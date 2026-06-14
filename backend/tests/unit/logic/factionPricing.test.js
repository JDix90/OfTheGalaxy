/**
 * Faction standing -> vendor pricing + tier gating (no DB).
 * Covers the #15A wiring: tier price modifiers, buy/sell breakdowns, and the
 * canonical tier-ladder comparison that replaced the old ad-hoc tier list.
 */

const factionService = require('../../../src/services/factionService');
const vendorService = require('../../../src/services/vendorService');

const baselineChar = { stats: { charisma: 10 } }; // charisma 10 => no charisma bonus
const factionNpc = { factionId: 'concord' };
const unalignedNpc = {};
const rep = (tier) => ({ tier });

describe('factionService.getPriceModifier', () => {
  test('maps tiers to signed modifiers (discount positive, surcharge negative)', () => {
    expect(factionService.getPriceModifier('exalted')).toBeCloseTo(0.10);
    expect(factionService.getPriceModifier('honored')).toBeCloseTo(0.06);
    expect(factionService.getPriceModifier('friendly')).toBeCloseTo(0.03);
    expect(factionService.getPriceModifier('neutral')).toBe(0);
    expect(factionService.getPriceModifier('unfriendly')).toBeCloseTo(-0.05);
    expect(factionService.getPriceModifier('hostile')).toBeCloseTo(-0.12);
    expect(factionService.getPriceModifier('hated')).toBeCloseTo(-0.20);
  });

  test('unknown tier contributes no modifier', () => {
    expect(factionService.getPriceModifier('bogus')).toBe(0);
    expect(factionService.getPriceModifier(undefined)).toBe(0);
  });
});

describe('factionService tier ladder comparison', () => {
  test('meetsTier respects the canonical low->high ordering', () => {
    expect(factionService.meetsTier('friendly', 'neutral')).toBe(true);
    expect(factionService.meetsTier('neutral', 'neutral')).toBe(true);
    expect(factionService.meetsTier('neutral', 'friendly')).toBe(false);
    expect(factionService.meetsTier('exalted', 'honored')).toBe(true);
    expect(factionService.meetsTier('hated', 'neutral')).toBe(false);
  });

  test('unknown tiers never satisfy a requirement', () => {
    expect(factionService.meetsTier('trusted', 'friendly')).toBe(false); // legacy/removed tier name
    expect(factionService.meetsTier('friendly', 'allied')).toBe(false);
  });

  test('compareTiers orders correctly', () => {
    expect(factionService.compareTiers('hated', 'exalted')).toBeLessThan(0);
    expect(factionService.compareTiers('exalted', 'hated')).toBeGreaterThan(0);
    expect(factionService.compareTiers('neutral', 'neutral')).toBe(0);
  });
});

describe('vendorService.calculateBuyBreakdown - faction standing', () => {
  test('neutral standing = sticker price (base * markup)', () => {
    const { unitPrice, breakdown } = vendorService.calculateBuyBreakdown(300, baselineChar, factionNpc, null, rep('neutral'));
    expect(unitPrice).toBe(360); // 300 * 1.2
    expect(breakdown.factionPct).toBe(0);
    expect(breakdown.factionTier).toBe('neutral');
  });

  test('honored standing discounts the buy price', () => {
    const { unitPrice, breakdown } = vendorService.calculateBuyBreakdown(300, baselineChar, factionNpc, null, rep('honored'));
    expect(breakdown.factionPct).toBeCloseTo(0.06);
    expect(unitPrice).toBe(Math.floor(300 * (1 - 0.06) * 1.2)); // 338
    expect(unitPrice).toBeLessThan(360);
  });

  test('hostile standing adds a surcharge above the sticker price', () => {
    const { unitPrice } = vendorService.calculateBuyBreakdown(300, baselineChar, factionNpc, null, rep('hostile'));
    expect(unitPrice).toBe(Math.floor(300 * (1 + 0.12) * 1.2)); // 403
    expect(unitPrice).toBeGreaterThan(360);
  });

  test('unaligned NPC ignores faction standing entirely', () => {
    const { unitPrice, breakdown } = vendorService.calculateBuyBreakdown(300, baselineChar, unalignedNpc, null, rep('hostile'));
    expect(breakdown.factionPct).toBe(0);
    expect(breakdown.factionTier).toBeNull();
    expect(unitPrice).toBe(360);
  });
});

describe('vendorService.calculateSellBreakdown - faction standing', () => {
  test('neutral standing = base sell rate (base * 0.8)', () => {
    const { unitPrice, breakdown } = vendorService.calculateSellBreakdown(300, baselineChar, factionNpc, null, rep('neutral'));
    expect(unitPrice).toBe(240);
    expect(breakdown.factionPct).toBe(0);
  });

  test('honored standing pays more, hostile pays less', () => {
    const honored = vendorService.calculateSellBreakdown(300, baselineChar, factionNpc, null, rep('honored')).unitPrice;
    const hostile = vendorService.calculateSellBreakdown(300, baselineChar, factionNpc, null, rep('hostile')).unitPrice;
    expect(honored).toBe(Math.floor(300 * 0.8 * 1.06)); // 254
    expect(hostile).toBe(Math.floor(300 * 0.8 * 0.88)); // 211
    expect(honored).toBeGreaterThan(240);
    expect(hostile).toBeLessThan(240);
  });
});

describe('vendorService modifier stacking', () => {
  test('charisma + relationship + faction discounts stack on buy', () => {
    // Charisma ramps +0.5%/point above base 10, so charisma 20 => 5%.
    const charismaChar = { stats: { charisma: 20 } };
    const relationship = { relationshipLevel: 100 };   // +15% relationship discount
    const { breakdown } = vendorService.calculateBuyBreakdown(300, charismaChar, factionNpc, relationship, rep('honored'));
    expect(breakdown.charismaPct).toBeCloseTo(0.05);
    expect(breakdown.relationshipPct).toBeCloseTo(0.15);
    expect(breakdown.factionPct).toBeCloseTo(0.06);
  });

  test('charisma discount caps at 10% (reached by charisma 30)', () => {
    const cha30 = { stats: { charisma: 30 } };
    const cha80 = { stats: { charisma: 80 } };
    expect(vendorService.calculateBuyBreakdown(300, cha30, {}, null, null).breakdown.charismaPct).toBeCloseTo(0.10);
    // Well past the cap stays clamped, never exceeding 10%.
    expect(vendorService.calculateBuyBreakdown(300, cha80, {}, null, null).breakdown.charismaPct).toBeCloseTo(0.10);
    // Base charisma 10 contributes nothing.
    expect(vendorService.calculateBuyBreakdown(300, { stats: { charisma: 10 } }, {}, null, null).breakdown.charismaPct).toBe(0);
  });
});
