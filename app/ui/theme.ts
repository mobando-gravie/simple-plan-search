/**
 * Shared class strings for the Gravie ICHRA look. Plain constants rather than cva —
 * nine view files do not earn a variant system, and four of them would otherwise
 * duplicate the button and table shells.
 */

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs px-3 py-[6px] ' +
  'text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 ' +
  'focus-visible:ring-ink-50 disabled:pointer-events-none disabled:opacity-50 ' +
  '[&_svg]:size-4 [&_svg]:shrink-0'

/** Filled CTA. The label is marketplace-orange-10, not white — that tint is the brand. */
export const BTN_SOLID = `${BTN_BASE} h-10 border border-transparent bg-marketplace-orange-60 text-marketplace-orange-10 hover:bg-marketplace-orange-70`

export const BTN_OUTLINE = `${BTN_BASE} h-10 border border-marketplace-orange-50 bg-white text-marketplace-orange-60 hover:bg-marketplace-orange-10`

export const BTN_TEXT = `${BTN_BASE} border border-transparent bg-transparent text-marketplace-orange-60 hover:bg-marketplace-orange-10`

/** 16px on mobile is what stops iOS zooming on focus; 14px from md up. */
export const FIELD =
  'h-10 w-full rounded-xs border border-ink-30 bg-white px-3 py-1 text-base shadow-sm ' +
  'transition-colors placeholder:text-brown-gravie-30 focus-visible:outline-none ' +
  'focus-visible:ring-1 focus-visible:ring-ink-50 disabled:opacity-50 md:text-sm'

export const LABEL = 'mb-1.5 block text-paragraph-small font-bold text-ink-50'

export const HINT = 'mt-1 block text-paragraph-extra-small text-brown-gravie-50'

export const CHECKBOX = 'h-4 w-4 rounded-xs border-ink-30 accent-marketplace-orange-60'

/** Flat dashboard surface — forms, disclosures, anything that holds controls. */
export const PANEL = 'rounded-lg bg-white p-6'

/** Plan-flow surface — results and the login card. Elevation, no border. */
export const CARD = 'rounded-sm bg-white shadow-elevation-1'

export const TABLE_WRAP = `overflow-x-auto ${CARD}`

export const THEAD = 'border-b border-brown-gravie-20 bg-white'

export const TH = 'px-4 py-3 text-left text-header-h6 uppercase text-brown-gravie-50'

export const TH_RIGHT = `${TH} text-right`

export const TBODY = 'divide-y divide-brown-gravie-20'

export const TR = 'transition-colors hover:bg-brown-gravie-5'

export const TD = 'px-4 py-3 text-paragraph-small'

export const CHIP =
  'inline-flex h-6 items-center justify-center gap-1 whitespace-nowrap rounded-xs border ' +
  'px-2 text-paragraph-extra-small font-bold'

export const BANNER_ERROR =
  'rounded-xs border border-destructive/40 bg-destructive/5 px-4 py-3 text-paragraph-small text-destructive'

export const BANNER_SUCCESS =
  'rounded-xs border border-secondary-green-60/30 bg-secondary-green-10 px-4 py-3 text-paragraph-small text-secondary-green-70'

/** The brand has no amber; member-frontend encodes negative sections as brown-gravie-10. */
export const BANNER_WARN =
  'rounded-xs border border-brown-gravie-20 bg-brown-gravie-10 px-4 py-3 text-brown-gravie-50'

export const CODE = 'rounded-xs bg-ink-10 px-1 py-0.5 font-mono text-[12px] text-ink-60'

/** h1 steps down a tier on mobile — 36px at -0.17px tracking wraps badly at 375px. */
export const H1 = 'text-header-h2 md:text-header-h1'

export const PAGE_SUBTITLE = 'mt-1 text-paragraph-regular text-brown-gravie-50'
