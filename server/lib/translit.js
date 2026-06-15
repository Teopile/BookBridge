// Script transliteration for search.
//
// School/place data is stored in mixed scripts — names in Georgian, many
// regions/cities in Latin (e.g. "Mestia", "Svaneti"). A Georgian-first audience
// types queries in Mkhedruli ("მესტია"), which never substring-matches the Latin
// listing. This maps Georgian (Mkhedruli) and Russian (Cyrillic) characters to
// their Latin equivalents so the search can match across scripts:
//   "მესტია" → "mestia"  → matches "Mestia"
//   "სვანეთი" → "svaneti" → matches "Svaneti"
// Latin input passes through unchanged (no map entry → char kept as-is).

const KA_TO_LATIN = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
  'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
  'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
  'ქ': 'k', 'ღ': 'gh', 'ყ': 'k', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
  'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
};

const RU_TO_LATIN = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
  'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

// Georgian: U+10A0–U+10FF, Cyrillic: U+0400–U+04FF.
const NON_LATIN_RE = /[Ⴀ-ჿЀ-ӿ]/;

/** True if the string contains any Georgian or Cyrillic character. */
export function hasNonLatinScript(s) {
  return NON_LATIN_RE.test(String(s || ''));
}

/**
 * Transliterate Georgian / Russian characters in `input` to Latin. Characters
 * with no mapping (already-Latin letters, digits, spaces, punctuation) are kept
 * verbatim. Result is lowercased.
 * @param {string} input
 * @returns {string}
 */
export function transliterate(input) {
  const s = String(input || '').toLowerCase();
  let out = '';
  for (const ch of s) {
    if (Object.prototype.hasOwnProperty.call(KA_TO_LATIN, ch)) out += KA_TO_LATIN[ch];
    else if (Object.prototype.hasOwnProperty.call(RU_TO_LATIN, ch)) out += RU_TO_LATIN[ch];
    else out += ch;
  }
  return out;
}
