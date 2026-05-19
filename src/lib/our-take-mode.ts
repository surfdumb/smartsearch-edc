export type OurTakeMode = 'leading' | 'button' | 'hidden';

/**
 * Reads the three fields needed to resolve the mode. Loose shape so the
 * helper accepts both the canonical SearchContext['deck_settings'] and
 * narrower local interfaces (e.g. EDCCard's component-scoped one).
 */
export type OurTakeSettingsSubset = {
  our_take_mode?: OurTakeMode;
  our_take_display?: 'SHOW' | 'HIDE';
  our_take_landing?: 'overlay' | 'bubble';
};

/**
 * Resolves the effective Our Take display mode for a deck.
 *
 * Priority:
 *   1. our_take_mode (canonical)
 *   2. Legacy fields: our_take_display + our_take_landing
 *   3. Default: 'button' (Phil's request, 18 May 2026)
 *
 * NOTE: This is a behaviour change for existing decks that have no
 * deck_settings set at all — they will now default to 'button'
 * instead of the legacy 'leading' default. Intentional.
 */
export function resolveOurTakeMode(
  settings: OurTakeSettingsSubset | undefined | null
): OurTakeMode {
  if (!settings) return 'button';
  if (settings.our_take_mode) return settings.our_take_mode;
  if (settings.our_take_display === 'HIDE') return 'hidden';
  if (settings.our_take_landing === 'overlay') return 'leading';
  return 'button';
}

/**
 * Returns the legacy field values that correspond to a given mode.
 * Used on write to keep the shadow fields in sync — any code that
 * still reads the legacy fields directly will see the right values.
 */
export function modeToLegacyFields(mode: OurTakeMode): {
  our_take_display: 'SHOW' | 'HIDE';
  our_take_landing: 'overlay' | 'bubble';
} {
  switch (mode) {
    case 'leading':
      return { our_take_display: 'SHOW', our_take_landing: 'overlay' };
    case 'button':
      return { our_take_display: 'SHOW', our_take_landing: 'bubble' };
    case 'hidden':
      return { our_take_display: 'HIDE', our_take_landing: 'bubble' };
  }
}
