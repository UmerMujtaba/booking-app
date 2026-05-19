import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device (iPhone X/11/12/13/14)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Normalizes font size based on screen scale and density.
 * It also accounts for the system's font scale setting to prevent 
 * text from becoming excessively large or small.
 */
export const normalize = (size: number) => {
  const scale = SCREEN_WIDTH / guidelineBaseWidth;
  const newSize = size * scale;
  
  // Get the system font scale
  const fontScale = PixelRatio.getFontScale();
  
  // We want to scale based on device width, but also manage the impact of system font scaling.
  // We cap the system font scale impact to prevent layouts from breaking.
  // This respects the user's setting up to 1.2x, then dampens it.
  const dampenedFontScale = fontScale > 1.2 ? 1.2 + (fontScale - 1.2) * 0.2 : fontScale;
  
  const finalSize = Math.round(PixelRatio.roundToNearestPixel(newSize)) / dampenedFontScale;

  return Platform.OS === 'ios' ? finalSize : finalSize - 1;
};

/**
 * Scales size based on screen width (for layout properties like padding, margin, width, height).
 */
export const rs = (size: number) => {
  const scale = SCREEN_WIDTH / guidelineBaseWidth;
  const newSize = size * scale;
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Moderate scaling for cases where full scaling might be too much.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (rs(size) - size) * factor;

/**
 * Vertical scale based on screen height.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;


export const isIos = () => Platform.OS === "ios";
