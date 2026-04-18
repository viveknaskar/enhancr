import { useState, useCallback, useMemo } from 'react';
import { FilterState, FILTER_DEFAULTS } from '../types';

export function buildFilterString(f: FilterState): string {
  const sharpen =
    f.sharpen > 0
      ? `url(data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg">
      <filter id="sharpen">
        <feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="
          0 -${f.sharpen} 0
          -${f.sharpen} ${1 + 4 * f.sharpen} -${f.sharpen}
          0 -${f.sharpen} 0
        "/>
      </filter>
    </svg>
  `)}#sharpen)`
      : '';
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) sepia(${f.sepia}%) grayscale(${f.grayscale}%) blur(${f.blur}px) ${sharpen}`.trim();
}

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);

  const setFilter = useCallback((key: keyof FilterState, value: number) =>
    setFilters((prev) => ({ ...prev, [key]: value })), []);

  const reset = useCallback(() => setFilters(FILTER_DEFAULTS), []);

  const restoreFilters = useCallback((state: FilterState) => setFilters(state), []);

  const filterString = useMemo(() => buildFilterString(filters), [filters]);

  return { filters, setFilter, filterString, reset, restoreFilters };
}
