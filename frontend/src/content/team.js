// Team members shown in the „ჩვენ ვართ" (Who we are) section on the About page.
//
// DATA-DRIVEN + SHIPS DARK: while this array is empty the section does not
// render at all. Adding a record = the section appears — zero code changes.
//
// Record shape:
//   id     unique slug
//   name   { ka, en }
//   role   { ka, en }
//   photo  path under frontend/public/ (square works best; rendered circular)
//   bio    { ka, en }  2–3 sentences
//
// TODO(content): waiting on real people + photos + bios from the owner.
export default [];
