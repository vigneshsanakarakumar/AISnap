/**
 * PiercingConfig — AR Piercing Studio Configurations & Catalogs
 */

export const DEBUG = false; // Strictly false in production — zero technical overlays on camera

export const PLACEMENTS = [
  { id: 'ear',   label: '👂 Ear',   icon: '👂', tracker: 'face', hint: 'Keep your face visible' },
  { id: 'navel', label: '✨ Navel', icon: '✨', tracker: 'torso', hint: 'Show your torso to preview' }
];

export const EAR_DESIGNS = [
  { id: 'silver_stud',  name: 'Silver Stud',  type: 'stud', metal: 'silver', gem: null },
  { id: 'gold_stud',    name: 'Gold Stud',    type: 'stud', metal: 'gold',   gem: null },
  { id: 'diamond_stud', name: 'Diamond Stud', type: 'stud', metal: 'silver', gem: 'diamond' },
  { id: 'star_stud',    name: 'Star Stud',    type: 'star', metal: 'gold',   gem: null },
  { id: 'small_hoop',   name: 'Small Hoop',   type: 'hoop', metal: 'silver', gem: null },
  { id: 'gold_hoop',    name: 'Gold Hoop',    type: 'hoop', metal: 'gold',   gem: null },
  { id: 'black_hoop',   name: 'Black Hoop',   type: 'hoop', metal: 'black',  gem: null }
];

export const NAVEL_DESIGNS = [
  { id: 'diamond_solitaire', name: 'Diamond Solitaire', type: 'curved', metal: 'silver', topGem: 'diamond', charm: 'diamond_drop' },
  { id: 'luxury_gold',       name: '18K Luxury Gold',   type: 'curved', metal: 'gold',   topGem: null,      charm: 'gold_ball' },
  { id: 'crystal_heart',     name: 'Rose Gold Heart',   type: 'curved', metal: 'rosegold', topGem: 'crystal', charm: 'heart' },
  { id: 'opal_lotus',        name: 'Opal Lotus Drop',   type: 'curved', metal: 'silver', topGem: 'opal',    charm: 'lotus' },
  { id: 'emerald_royal',     name: 'Emerald Crown',     type: 'curved', metal: 'gold',   topGem: 'emerald', charm: 'emerald_drop' },
  { id: 'celestial_star',    name: 'Celestial Star',    type: 'curved', metal: 'silver', topGem: 'diamond', charm: 'star' },
  { id: 'obsidian_titanium', name: 'Black Titanium',    type: 'curved', metal: 'black',  topGem: null,      charm: 'obsidian_drop' }
];

export function getDesignsForPlacement(placementId) {
  if (placementId === 'navel') return NAVEL_DESIGNS;
  return EAR_DESIGNS;
}

export const METAL_PALETTES = {
  silver: {
    edge: '#1e293b',
    darkMid: '#475569',
    mid: '#cbd5e1',
    sheen: '#f1f5f9',
    highlight: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.45)'
  },
  gold: {
    edge: '#451a03',
    darkMid: '#854d0e',
    mid: '#eab308',
    sheen: '#fef08a',
    highlight: '#ffffff',
    shadow: 'rgba(30, 15, 0, 0.45)'
  },
  rosegold: {
    edge: '#4c0519',
    darkMid: '#9f1239',
    mid: '#fb7185',
    sheen: '#ffe4e6',
    highlight: '#ffffff',
    shadow: 'rgba(40, 10, 20, 0.45)'
  },
  black: {
    edge: '#09090b',
    darkMid: '#18181b',
    mid: '#3f3f46',
    sheen: '#71717a',
    highlight: '#e4e4e7',
    shadow: 'rgba(0, 0, 0, 0.6)'
  }
};

export const GEM_PALETTES = {
  diamond: {
    base: '#f0fdf4',
    inner: '#bae6fd',
    deep: '#38bdf8',
    highlight: '#ffffff',
    edge: '#93c5fd'
  },
  crystal: {
    base: '#faf5ff',
    inner: '#f3e8ff',
    deep: '#c084fc',
    highlight: '#ffffff',
    edge: '#e9d5ff'
  },
  opal: {
    base: '#f0fdfa',
    inner: '#99f6e4',
    deep: '#2dd4bf',
    highlight: '#ffffff',
    edge: '#5eead4'
  },
  emerald: {
    base: '#ecfdf5',
    inner: '#34d399',
    deep: '#059669',
    highlight: '#d1fae5',
    edge: '#047857'
  }
};
