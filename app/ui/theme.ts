/**
 * Shared class strings for the Gravie ICHRA look. Colors come from colors.ts as named
 * roles; the components in this folder consume these, and they stay exported for the
 * cases a component cannot reach — file: pseudo-classes, an <a> styled as a button.
 */

import { BG, BORDER, DIVIDE, FOCUS_RING, HOVER, PLACEHOLDER, TEXT } from './colors'

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs px-3 py-[6px] ' +
  `text-sm font-bold transition-colors ${FOCUS_RING} ` +
  'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'

/** Filled CTA. The label is the brand-10 tint rather than plain white. */
export const BTN_SOLID = `${BTN_BASE} h-10 border border-transparent ${BG.accent} ${TEXT.onAccent} ${HOVER.accentStrongSurface}`

export const BTN_OUTLINE = `${BTN_BASE} h-10 border ${BORDER.accent} ${BG.surface} ${TEXT.accent} ${HOVER.accentSurface}`

export const BTN_TEXT = `${BTN_BASE} border border-transparent bg-transparent ${TEXT.accent} ${HOVER.accentSurface}`

/**
 * Muted until hover, for a remove action sitting beside a neutral one. A separate
 * variant rather than an override: two competing text-* classes are resolved by
 * their order in the generated CSS, not by the order in the class attribute.
 */
export const BTN_TEXT_DESTRUCTIVE = `${BTN_BASE} border border-transparent bg-transparent ${TEXT.muted} ${HOVER.danger}`

/** The outline button's palette on a file input's own button, so the two cannot drift. */
export const FILE_BUTTON =
  'file:mr-3 file:rounded-xs file:border file:border-brand-50 file:bg-white ' +
  'file:px-3 file:py-[6px] file:text-sm file:font-bold file:text-brand-60 ' +
  'hover:file:bg-brand-10'

/** 16px on mobile is what stops iOS zooming on focus; 14px from md up. */
const FIELD_BASE =
  `h-10 rounded-xs border ${BORDER.input} ${BG.surface} px-3 py-1 text-base shadow-sm ` +
  `transition-colors ${PLACEHOLDER.faint} ${FOCUS_RING} disabled:opacity-50 md:text-sm`

export const FIELD = `w-full ${FIELD_BASE}`

/** Width is a separate class so a narrow field composes rather than string-replacing. */
export function fieldClass(width = 'w-full'): string {
  return `${width} ${FIELD_BASE}`
}

/** Without the margin, for a label sharing a row with something else. */
export const LABEL_TEXT = `block text-paragraph-small font-bold ${TEXT.body}`

export const LABEL = `mb-1.5 ${LABEL_TEXT}`

export const HINT = `mt-1 block text-paragraph-extra-small ${TEXT.muted}`

export const CHECKBOX = `h-4 w-4 rounded-xs ${BORDER.input} accent-brand-60`

/** The two muted caption sizes — by far the most repeated pair in the app. */
export const MUTED = `text-paragraph-small ${TEXT.muted}`
export const FAINT = `text-paragraph-small ${TEXT.faint}`
export const MUTED_XS = `text-paragraph-extra-small ${TEXT.muted}`
export const FAINT_XS = `text-paragraph-extra-small ${TEXT.faint}`

/** The house surface: elevation instead of a border, on the warm page ground. */
export const CARD = `rounded-sm ${BG.surface} shadow-elevation-1`

/** A card with its own padding; tighter on phones where the gutter is already 16px. */
export const PANEL = `${CARD} p-4 sm:p-6`

/** Padding is the caller's — the plan card and the modal head sit at different scales. */
export const CARD_HEADER = `flex gap-3 border-b ${BORDER.subtle} ${BG.sunken}`

/** Padding shared by a panel's head and body, so a flush table lines up with the title. */
export const PANEL_PAD = 'px-4 sm:px-6'

export const PANEL_TITLE = `text-header-h4 ${TEXT.heading}`

/** A pickable tile — a rating area in a state, an example lookup in an empty state. */
export const TILE =
  `block w-full rounded-sm border ${BORDER.subtle} ${BG.surface} px-3 py-2 text-left ` +
  `text-paragraph-small transition-colors hover:border-brand-50 ${HOVER.accentSurface} ${FOCUS_RING}`

/** An inline text link. Underlined so it reads as a link in a run of muted text. */
export const LINK = `rounded-xs underline underline-offset-2 ${TEXT.accent} ${HOVER.accent} ${FOCUS_RING}`

/** Share bars — the metal mix, an issuer's slice of a county. */
export const BAR_TRACK = `h-1.5 w-full overflow-hidden rounded-full ${BG.neutral}`
export const BAR_FILL = `h-full rounded-full ${BG.accent}`

export const DIVIDED_TOP = `border-t ${BORDER.subtle}`

export const DIVIDED_LIST = `divide-y ${DIVIDE}`

export const TABLE_WRAP = `overflow-x-auto ${CARD}`

export const THEAD = `border-b ${BORDER.subtle} ${BG.surface}`

export const TH = `px-4 py-3 text-left text-header-h6 uppercase ${TEXT.muted}`

export const TH_RIGHT = `${TH} text-right`

export const TBODY = DIVIDED_LIST

export const TR = 'transition-colors hover:bg-brown-gravie-5'

/** A pickable row in a dropdown or hit list. */
export const HOVER_ROW = HOVER.accentSurface

export const TD = 'px-4 py-3 text-paragraph-small'

/** The dense pair, for a table of numbers inside a panel. */
export const TH_DENSE = `px-3 py-2 text-left text-header-h6 uppercase ${TEXT.muted}`
export const TD_DENSE = 'px-3 py-2 text-paragraph-small'

/** Numeric cells: right-aligned, tabular digits, never wrapped. */
export const TD_NUM = 'tnum whitespace-nowrap text-right'

/** The first cell of a wide table stays put while the rest scrolls. */
export const TD_STICKY = `sticky left-0 ${BG.surface}`

export const CHIP =
  'inline-flex h-6 items-center justify-center gap-1 whitespace-nowrap rounded-xs border ' +
  'px-2 text-paragraph-extra-small font-bold'

export const BANNER_ERROR = `rounded-xs border ${BORDER.danger} ${BG.danger} px-4 py-3 text-paragraph-small ${TEXT.danger}`

export const BANNER_SUCCESS = `rounded-xs border ${BORDER.positiveSoft} ${BG.positive} px-4 py-3 text-paragraph-small ${TEXT.positive}`

/** The brand has no amber; member-frontend encodes negative sections as brown-gravie-10. */
export const BANNER_WARN = `rounded-xs border ${BORDER.subtle} ${BG.sunken} px-4 py-3 ${TEXT.muted}`

export const CODE = `rounded-xs ${BG.neutral} px-1 py-0.5 font-mono text-paragraph-extra-small ${TEXT.heading}`

export const CODE_BLOCK = `overflow-x-auto rounded-xs ${BG.neutral} p-4 font-mono text-paragraph-extra-small ${TEXT.heading}`

/** The page column, shared by the header and main so their edges line up. */
export const CONTAINER = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8'

/** h1 steps down a tier on mobile — 36px at -0.17px tracking wraps badly at 375px. */
export const H1 = 'text-header-h2 md:text-header-h1'

export const SECTION_TITLE = `text-header-h3 ${TEXT.heading}`

export const PAGE_SUBTITLE = `mt-2 max-w-3xl text-paragraph-regular ${TEXT.muted}`

/** The small uppercase label over a figure or a section — the stat labels, "Search". */
export const EYEBROW = `text-header-h5 uppercase ${TEXT.muted}`

/** A figure under an eyebrow: tabular digits so a column of them lines up. */
export const FIGURE = `tnum text-header-h2 ${TEXT.heading}`
