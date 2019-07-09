/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
export const NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
export const VALUES_REGEXP = /([^\(\)\s\|\s]*)\s*(\(.*\))?\s*(\|?\s*.+)?/;
export const SAVE_ON_TAB = 'tab';
export const SAVE_ON_SPACE = 'space';
export const SAVE_ON_ENTER = 'enter';
export const SAVE_ON_BLUR = 'blur';
