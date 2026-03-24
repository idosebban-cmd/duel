/**
 * Discover stack card geometry at max width — single source of truth for the main
 * photo strip aspect (ProfileCard in DiscoverScreen). Crop/export/preview must match.
 */
export const DISCOVER_CARD_WIDTH = 340;
export const DISCOVER_CARD_HEIGHT = 460;
export const DISCOVER_PHOTO_HEIGHT_PCT = 0.54;

/** Height (px) of the photo strip when the card is DISCOVER_CARD_WIDTH × DISCOVER_CARD_HEIGHT. */
export const DISCOVER_PHOTO_AREA_HEIGHT_PX =
  DISCOVER_CARD_HEIGHT * DISCOVER_PHOTO_HEIGHT_PCT;

/** Photo region width ÷ height (landscape strip, > 1). */
export const DISCOVER_PHOTO_ASPECT_WH =
  DISCOVER_CARD_WIDTH / DISCOVER_PHOTO_AREA_HEIGHT_PX;

/** Interactive crop viewport in PhotoCropModal — same aspect as Discover photo area. */
export const PHOTO_CROP_VIEWPORT_WIDTH_PX = 280;
export const PHOTO_CROP_VIEWPORT_HEIGHT_PX = Math.round(
  PHOTO_CROP_VIEWPORT_WIDTH_PX / DISCOVER_PHOTO_ASPECT_WH,
);

/** Full-size JPEG export after crop (long edge = width). */
export const PHOTO_CROP_EXPORT_WIDTH_PX = 1200;
export const PHOTO_CROP_EXPORT_HEIGHT_PX = Math.round(
  PHOTO_CROP_EXPORT_WIDTH_PX * DISCOVER_PHOTO_AREA_HEIGHT_PX / DISCOVER_CARD_WIDTH,
);

/** Small “Discover preview” thumbnail in PhotoCropModal (same aspect). */
export const PHOTO_CROP_PREVIEW_MAX_WIDTH_PX = 220;
export const PHOTO_CROP_PREVIEW_HEIGHT_PX = Math.round(
  PHOTO_CROP_PREVIEW_MAX_WIDTH_PX / DISCOVER_PHOTO_ASPECT_WH,
);

/** Debounced preview render resolution (same aspect as crop). */
export const PHOTO_CROP_PREVIEW_RENDER_WIDTH_PX = 680;
export const PHOTO_CROP_PREVIEW_RENDER_HEIGHT_PX = Math.round(
  PHOTO_CROP_PREVIEW_RENDER_WIDTH_PX / DISCOVER_PHOTO_ASPECT_WH,
);
