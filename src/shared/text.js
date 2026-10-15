// Rules for the text a user types, shared by every module that stores it (#112, #113).
//
// Lengths are counted in characters (Unicode code points), as PostgreSQL counts VARCHAR and TEXT, so an
// emoji or an accented letter counts once. String length in JavaScript counts UTF-16 units, where an emoji
// counts twice.
//
// PostgreSQL refuses the NUL character in text, so a value carrying one would pass validation and then
// fail in the store with a server error. NUL and the other control characters are refused here instead,
// with a message for the field. A field that holds more than one line keeps its line breaks and tabs.

export const characters = (value) => [...value].length;

const CONTROL_ONE_LINE = /[\u0000-\u001F\u007F]/;
const CONTROL_MULTILINE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/; // keeps \t, \n and \r

export function hasControlCharacter(value, { multiline = false } = {}) {
  return (multiline ? CONTROL_MULTILINE : CONTROL_ONE_LINE).test(value);
}
