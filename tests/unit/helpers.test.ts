import { generateUniqueFileName, calculateMedian } from '../../src/utils/helpers';

describe('Helpers', () => {
  test('generateUniqueFileName includes timestamp', () => {
    const fileName = generateUniqueFileName('test.csv');
    expect(fileName).toMatch(/^\d+-[a-f0-9]+\.csv$/);
  });

  test('calculateMedian works correctly', () => {
    expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3);
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });
});