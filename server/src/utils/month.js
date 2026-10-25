export function monthRange(month) {
  const selected = /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')
    ? month : new Date().toISOString().slice(0, 7);
  const [year, mon] = selected.split('-').map(Number);
  return { month: selected, start: new Date(Date.UTC(year, mon - 1, 1)), end: new Date(Date.UTC(year, mon, 1)) };
}
