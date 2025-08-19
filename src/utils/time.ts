/**
 * TODO migrate everything here to aerie-time-utils
 */
import { getDoyTimeComponents } from "@nasa-jpl/aerie-time-utils";

/**
 * Get a day-of-year timestamp from a given JavaScript Date object.
 * @example getDoyTime(new Date(1577779200000)) -> 2019-365T08:00:00
 * @note inverse of getUnixEpochTime
 * @note milliseconds will be dropped if all 0s
 */
export function getDoyTime(date: Date, includeMsecs = true): string {
  const { doy, hours, mins, msecs, secs, year } = getDoyTimeComponents(date);
  let doyTimestamp = `${year}-${doy}T${hours}:${mins}:${secs}`;

  if (includeMsecs && date.getMilliseconds() > 0) {
    doyTimestamp += `.${msecs}`;
  }

  return doyTimestamp;
}
