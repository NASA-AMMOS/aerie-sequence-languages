import { expect, test } from 'vitest';
import { getDoyTime } from './time.js'

test('getDoyTime', () => {
  const doyTime = getDoyTime(new Date(1577779200000));
  expect(doyTime).toEqual('2019-365T08:00:00');
});
