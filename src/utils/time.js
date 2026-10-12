export function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

export function durationMinutes(startTime, endTime) {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  return diff > 0 ? diff : 0;
}

export function rangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function toDateTime(date, time, offsetMinutes = 0) {
  const normalized = String(time).length === 5 ? `${time}:00` : String(time);
  const asUtc = Date.parse(`${date}T${normalized}Z`);
  return new Date(asUtc - offsetMinutes * 60_000);
}
