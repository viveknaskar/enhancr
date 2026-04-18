/** Minimum crop dimension as a fraction of the image (prevents collapsing to zero). */
export const CROP_MIN_SIZE = 0.02;

/** Maximum upload file size in bytes. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Crop overlay: spread distance for the darkening box-shadow outside the crop box. */
export const CROP_SHADOW_SPREAD = '9999px';

/** Crop overlay: opacity of the dark vignette outside the crop box. */
export const CROP_OVERLAY_OPACITY = 0.55;

/** Crop overlay: opacity of the rule-of-thirds grid lines. */
export const CROP_GRID_OPACITY = 0.35;
