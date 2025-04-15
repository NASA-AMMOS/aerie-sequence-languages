import type { FswCommand, HwCommand } from '@nasa-jpl/aerie-ampcs';
import { isFswCommand } from './dictionary';

describe('Command and argument type guards', () => {
  test('isFswCommand', () => {
    expect(
      isFswCommand({
        type: 'fsw_command',
      } as FswCommand),
    ).toBeTruthy();

    expect(
      isFswCommand({
        type: 'hw_command',
      } as HwCommand),
    ).toBeFalsy();
  });
});
