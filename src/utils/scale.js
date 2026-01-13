import { Dimensions, PixelRatio } from 'react-native';

let { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
let DESIGN_WIDTH = 375;
let DESIGN_HEIGHT = 812;
let FONT_SCALE = PixelRatio.getFontScale ? PixelRatio.getFontScale() : 1;

const onChange = () => {
  const dw = Dimensions.get('window');
  SCREEN_WIDTH = dw.width;
  SCREEN_HEIGHT = dw.height;
  FONT_SCALE = PixelRatio.getFontScale ? PixelRatio.getFontScale() : 1;
};

Dimensions.addEventListener?.('change', onChange);

export const setDesignSize = (width, height) => {
  if (Number(width)) DESIGN_WIDTH = Number(width);
  if (Number(height)) DESIGN_HEIGHT = Number(height);
};

const round = (n) => Math.round(PixelRatio.roundToNearestPixel(n));

export const scale = (size) => round((SCREEN_WIDTH / DESIGN_WIDTH) * size);
export const verticalScale = (size) => round((SCREEN_HEIGHT / DESIGN_HEIGHT) * size);
export const moderateScale = (size, factor = 0.5) => round(size + (scale(size) - size) * factor);
export const font = (size, factor = 0.5) => round(moderateScale(size, factor) / FONT_SCALE);
export const metrics = () => ({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, designWidth: DESIGN_WIDTH, designHeight: DESIGN_HEIGHT, fontScale: FONT_SCALE, pixelRatio: PixelRatio.get() });

export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
export const fs = font;
