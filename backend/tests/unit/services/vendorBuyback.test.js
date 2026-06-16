/**
 * Vendor buyback ledger — pure helper tests (no DB).
 *
 * Covers the static recordBuyback / consumeBuyback functions that back the
 * per-vendor buyback feature, exercising merge, ordering, capping and consume
 * semantics without touching Sequelize.
 */

const vendorService = require('../../../src/services/vendorService');
const VendorService = vendorService.constructor;

describe('VendorService buyback ledger (pure)', () => {
  describe('recordBuyback', () => {
    test('adds a new entry to an empty/undefined ledger, newest first', () => {
      const ledger = VendorService.recordBuyback(undefined, { itemId: 'medpac_01', quantity: 2, unitPrice: 40 });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({ itemId: 'medpac_01', quantity: 2, unitPrice: 40 });
      expect(typeof ledger[0].soldAt).toBe('string');
    });

    test('merges the same item: sums quantity, refreshes price, moves to front', () => {
      let ledger = VendorService.recordBuyback([], { itemId: 'a', quantity: 1, unitPrice: 10 });
      ledger = VendorService.recordBuyback(ledger, { itemId: 'b', quantity: 1, unitPrice: 5 });
      ledger = VendorService.recordBuyback(ledger, { itemId: 'a', quantity: 3, unitPrice: 12 });

      expect(ledger).toHaveLength(2);
      expect(ledger[0]).toMatchObject({ itemId: 'a', quantity: 4, unitPrice: 12 }); // merged + most recent
      expect(ledger[1].itemId).toBe('b');
    });

    test('floors/clamps quantity and price to sane minimums', () => {
      const ledger = VendorService.recordBuyback([], { itemId: 'x', quantity: 0, unitPrice: 0 });
      expect(ledger[0].quantity).toBe(1);
      expect(ledger[0].unitPrice).toBe(1);
    });

    test('caps distinct entries at MAX_BUYBACK_ENTRIES (newest kept)', () => {
      let ledger = [];
      const total = VendorService.MAX_BUYBACK_ENTRIES + 4;
      for (let i = 0; i < total; i++) {
        ledger = VendorService.recordBuyback(ledger, { itemId: `item_${i}`, quantity: 1, unitPrice: 10 });
      }
      expect(ledger).toHaveLength(VendorService.MAX_BUYBACK_ENTRIES);
      expect(ledger[0].itemId).toBe(`item_${total - 1}`); // newest at front
    });

    test('does not mutate the input ledger', () => {
      const input = [{ itemId: 'a', quantity: 1, unitPrice: 10, soldAt: 't' }];
      const out = VendorService.recordBuyback(input, { itemId: 'a', quantity: 1, unitPrice: 11 });
      expect(input[0].quantity).toBe(1); // unchanged
      expect(out[0].quantity).toBe(2);
    });
  });

  describe('consumeBuyback', () => {
    const base = () => ([
      { itemId: 'a', quantity: 5, unitPrice: 12, soldAt: 't1' },
      { itemId: 'b', quantity: 2, unitPrice: 7, soldAt: 't2' }
    ]);

    test('decrements quantity and locks in the sold price', () => {
      const { ledger, unitPrice, totalCost } = VendorService.consumeBuyback(base(), 'a', 2);
      expect(unitPrice).toBe(12);
      expect(totalCost).toBe(24);
      expect(ledger.find((e) => e.itemId === 'a').quantity).toBe(3);
    });

    test('removes the entry entirely when fully bought back', () => {
      const { ledger } = VendorService.consumeBuyback(base(), 'b', 2);
      expect(ledger.find((e) => e.itemId === 'b')).toBeUndefined();
      expect(ledger).toHaveLength(1);
    });

    test('throws when the item is not in the ledger', () => {
      expect(() => VendorService.consumeBuyback(base(), 'missing', 1)).toThrow(/no buyback record/i);
    });

    test('throws when requesting more than available', () => {
      expect(() => VendorService.consumeBuyback(base(), 'b', 5)).toThrow(/available to buy back/i);
    });

    test('does not mutate the input ledger', () => {
      const input = base();
      VendorService.consumeBuyback(input, 'a', 1);
      expect(input.find((e) => e.itemId === 'a').quantity).toBe(5);
    });
  });
});
