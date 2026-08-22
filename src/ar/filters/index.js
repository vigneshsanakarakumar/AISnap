/**
 * AR Filter Registry — Complete Modular AR Filter Engine
 */

import { DesignerNailsFilter } from './DesignerNailsFilter.js';
import { ARTattooFilter } from './ARTattooFilter.js';
import { PuppyDogFilter } from './PuppyDogFilter.js';
import { CuteKittyFilter } from './CuteKittyFilter.js';
import { BunnyRabbitFilter } from './BunnyRabbitFilter.js';
import { SakuraCrownFilter } from './SakuraCrownFilter.js';
import { VirtualGlassesFilter } from './VirtualGlassesFilter.js';
import { NeonEyesFilter } from './NeonEyesFilter.js';
import { SparkleFaceFilter } from './SparkleFaceFilter.js';
import { SoftGlowFilter } from './SoftGlowFilter.js';
import { GoldenHourFilter } from './GoldenHourFilter.js';
import { CyberHUDFilter } from './CyberHUDFilter.js';
import { FaceMaskFilter } from './FaceMaskFilter.js';
import { CartoonOutlineFilter } from './CartoonOutlineFilter.js';
import { FloatingHeartsFilter } from './FloatingHeartsFilter.js';
import { BackgroundBlurFilter } from './BackgroundBlurFilter.js';
import { MirrorKaleidoscopeFilter } from './MirrorKaleidoscopeFilter.js';
import { OriginalFilter } from './OriginalFilter.js';

export const ALL_FILTERS = [
  new DesignerNailsFilter(),
  new ARTattooFilter(),
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
