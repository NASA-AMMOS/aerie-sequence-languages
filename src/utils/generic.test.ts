import { describe, expect, test } from 'vitest';
import { filterEmpty } from './generic.js';

describe('filterEmpty', () => {
  test('Should correctly determine if something is not null or undefined or an empty string', () => {
    expect(filterEmpty(0)).toEqual(true);
    expect(filterEmpty(false)).toEqual(true);
    expect(filterEmpty(null)).toEqual(false);
    expect(filterEmpty(undefined)).toEqual(false);
    expect(filterEmpty('foo')).toEqual(true);
    expect(filterEmpty('')).toEqual(false);
  });

  test('Should correctly filter out null and undefined entries in arrays', () => {
    expect([0, 1, 2, null, 4, undefined, 5].filter(filterEmpty)).toStrictEqual([0, 1, 2, 4, 5]);
    expect(['false', false, { foo: 1 }, null, undefined, ''].filter(filterEmpty)).toStrictEqual([
      'false',
      false,
      { foo: 1 },
    ]);
  });
});
