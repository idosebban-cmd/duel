/**
 * Discover stack card geometry — photo aspect 300:350 (portrait). Crop/export must match.
 */
export const DISCOVER_CARD_WIDTH = 340;

/** Photo width ÷ height (300 wide × 350 tall). */
export const DISCOVER_PHOTO_ASPECT_WH = 300 / 350;

/** Photo band height when the card is `DISCOVER_CARD_WIDTH` wide. */
export const DISCOVER_PHOTO_AREA_HEIGHT_PX = Math.round(
  (DISCOVER_CARD_WIDTH * 350) / 300,
);

/**
 * Reserved height for name, location, avatar tiles, intent row (Discover ProfileCard).
 * Chosen so flex-1 info area does not clip at max card width.
 */
export const DISCOVER_CARD_INFO_AREA_MIN_HEIGHT_PX = 276;

export const DISCOVER_CARD_HEIGHT =
  DISCOVER_PHOTO_AREA_HEIGHT_PX + DISCOVER_CARD_INFO_AREA_MIN_HEIGHT_PX;

/**
 * Fraction of card height occupied by the photo at `DISCOVER_CARD_WIDTH` (for any legacy math).
 */
export const DISCOVER_PHOTO_HEIGHT_PCT =
  DISCOVER_PHOTO_AREA_HEIGHT_PX / DISCOVER_CARD_HEIGHT;

/** Interactive crop viewport in PhotoCropModal — same aspect as Discover photo area. */
export const PHOTO_CROP_VIEWPORT_WIDTH_PX = 280;
export const PHOTO_CROP_VIEWPORT_HEIGHT_PX = Math.round(
  PHOTO_CROP_VIEWPORT_WIDTH_PX / DISCOVER_PHOTO_ASPECT_WH,
);

/** Full-size JPEG export after crop (fixed width). */
export const PHOTO_CROP_EXPORT_WIDTH_PX = 1200;
export const PHOTO_CROP_EXPORT_HEIGHT_PX = Math.round(
  (PHOTO_CROP_EXPORT_WIDTH_PX * 350) / 300,
);
