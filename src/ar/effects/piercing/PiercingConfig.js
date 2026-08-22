/**
 * PiercingConfig — Design catalogue and placement metadata
 */

// DEBUG flag: set to false before shipping to production
export const DEBUG = true;

export const PLACEMENTS = [
  { id: 'ear',    label: 'Ear',    icon: '👂', tracker: 'face', hint: 'Keep your face visible' },
  { id: 'tongue', label: 'Tongue', icon: '👅', tracker: 'face', hint: 'Open your mouth to preview' },
  { id: 'navel',  label: 'Navel',  icon: '✨', tracker: 'pose', hint: 'Show your torso to preview' },
];

export const EAR_DESIGNS = [
  { id: 'silver_stud',  name: 'Silver Stud',  type: 'stud', metal: 'silver', gem: null },
  { id: 'gold_stud',    name: 'Gold Stud',    type: 'stud', metal: 'gold',   gem: null },
  { id: 'diamond_stud', name: 'Diamond Stud', type: 'stud', metal: 'silver', gem: 'diamond' },
  { id: 'star_stud',    name: 'Star Stud',    type: 'star', metal: 'gold',   gem: null },
  { id: 'small_hoop',   name: 'Small Hoop',   type: 'hoop', metal: 'silver', gem: null },
  { id: 'gold_hoop',    name: 'Gold Hoop',    type: 'hoop', metal: 'gold',   gem: null },
  { id: 'black_hoop',   name: 'Black Hoop',   type: 'hoop', metal: 'black',  gem: null },
];

export const TONGUE_DESIGNS = [
  { id: 'silver_barbell', name: 'Silver Barbell',      type: 'barbell', metal: 'silver', gem: null,    doubled: false },
  { id: 'gold_barbell',   name: 'Gold Barbell',        type: 'barbell', metal: 'gold',   gem: null,    doubled: false },
  { id: 'black_barbell',  name: 'Black Titanium',      type: 'barbell', metal: 'black',  gem: null,    doubled: false },
  { id: 'gem_barbell',    name: 'Gem Ball Barbell',    type: 'barbell', metal: 'silver', gem: 'aqua',  doubled: false },
  { id: 'double_barbell', name: 'Double Ball Barbell', type: 'barbell', metal: 'silver', gem: null,    doubled: true  },
];

export const NAVEL_DESIGNS = [
  { id: 'silver_curved', name: 'Classic Silver', type: 'curved_barbell', metal: 'silver', charm: null     },
  { id: 'gold_curved',   name: 'Gold Curved',    type: 'curved_barbell', metal: 'gold',   charm: null     },
  { id: 'crystal_ring',  name: 'Crystal Ring',   type: 'curved_barbell', metal: 'silver', charm: 'crystal'},
  { id: 'heart_charm',   name: 'Heart Charm',    type: 'curved_barbell', metal: 'gold',   charm: 'heart'  },
  { id: 'star_charm',    name: 'Star Charm',     type: 'curved_barbell', metal: 'silver', charm: 'star'   },
  { id: 'gem_drop',      name: 'Gem Drop',       type: 'curved_barbell', metal: 'gold',   charm: 'gem'    },
];

export function getDesignsForPlacement(placementId) {
  if (placementId === 'ear')    return EAR_DESIGNS;
  if (placementId === 'tongue') return TONGUE_DESIGNS;
  if (placementId === 'navel')  return NAVEL_DESIGNS;
  return EAR_DESIGNS;
}

export const METAL_PALETTES = {
  silver: { edge: '#4a5568', mid: '#a0aec0', highlight: '#f7fafc', sheen: '#e2e8f0', shadow: 'rgba(0,0,0,0.35)' },
  gold:   { edge: '#744210', mid: '#d69e2e', highlight: '#fefcbf', sheen: '#f6e05e', shadow: 'rgba(0,0,0,0.35)' },
  black:  { edge: '#1a1a1a', mid: '#3d3d3d', highlight: '#6b7280', sheen: '#4b5563', shadow: 'rgba(0,0,0,0.5)'  },
};

export const GEM_PALETTES = {
  diamond: { base: '#e8f4fd', inner: '#bfdbfe', highlight: '#ffffff', edge: '#93c5fd' },
  aqua:    { base: '#06b6d4', inner: '#0e7490', highlight: '#cffafe', edge: '#0891b2' },
  crystal: { base: '#e9d5ff', inner: '#a855f7', highlight: '#ffffff', edge: '#7c3aed' },
  heart:   { base: '#ec4899', inner: '#be185d', highlight: '#fce7f3', edge: '#9d174d' },
  star:    { base: '#fbbf24', inner: '#d97706', highlight: '#fef3c7', edge: '#92400e' },
  gem:     { base: '#10b981', inner: '#065f46', highlight: '#d1fae5', edge: '#047857' },
};
