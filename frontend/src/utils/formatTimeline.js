export function formatTimelineRange(timelineMin, timelineMax, timelineUnit) {
  if (timelineMin == null || timelineMax == null || !timelineUnit) {
    return "Not provided";
  }
  return `${timelineMin} to ${timelineMax} ${timelineUnit}`;
}
