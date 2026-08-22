/**
 * AR Filter Registry — All 12+ Original Filter Engine Implementations
 */

import { OriginalFilter } from './OriginalFilter.js';
import { SoftGlowFilter } from './SoftGlowFilter.js';
import { NeonEyesFilter } from './NeonEyesFilter.js';
import { VirtualGlassesFilter } from './VirtualGlassesFilter.js';
import { SparkleFaceFilter } from './SparkleFaceFilter.js';
import { GoldenHourFilter } from './GoldenHourFilter.js';
import { CyberHUDFilter } from './CyberHUDFilter.js';
import { CartoonOutlineFilter } from './CartoonOutlineFilter.js';
import { FloatingHeartsFilter } from './FloatingHeartsFilter.js';
import { FaceMaskFilter } from './FaceMaskFilter.js';
import { BackgroundBlurFilter } from './BackgroundBlurFilter.js';
import { MirrorKaleidoscopeFilter } from './MirrorKaleidoscopeFilter.js';
import { PuppyDogFilter } from './PuppyDogFilter.js';
import { CuteKittyFilter } from './CuteKittyFilter.js';
import { BunnyRabbitFilter } from './BunnyRabbitFilter.js';
import { SakuraCrownFilter } from './SakuraCrownFilter.js';

export const ALL_FILTERS = [
  new PuppyDogFilter(),
  new CuteKittyFilter(),
  new BunnyRabbitFilter(),
  new SakuraCrownFilter(),
  new VirtualGlassesFilter(),
  new NeonEyesFilter(),
  new SparkleFaceFilter(),
  new SoftGlowFilter(),
  new GoldenHourFilter(),
  new CyberHUDFilter(),
  new FaceMaskFilter(),
  new CartoonOutlineFilter(),
  new FloatingHeartsFilter(),
  new BackgroundBlurFilter(),
  new MirrorKaleidoscopeFilter(),
  new OriginalFilter()
];

export const FILTER_MAP = ALL_FILTERS.reduce((acc, f) => {
  acc[f.id] = f;
  return acc;
}, {});

export function getFilterById(id) {
  return FILTER_MAP[id] || ALL_FILTERS[0];
}
