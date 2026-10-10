/**
 * ─────────────────────────────────────────────────────────────────────────
 *  YOUR PARCEL — edit this file to make the site yours.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  • Put your files in assets/art, assets/photo, assets/handwriting or
 *    assets/sounds, then change the matching path below.
 *  • Paths are relative to index.html, with no leading "/", so the site works
 *    both at https://<you>.github.io/ and at https://<you>.github.io/<repo>/.
 *  • Anything still pointing at assets/placeholders/… is a stand-in.
 *    The browser console lists every placeholder still in use.
 *  • If a path is wrong, the site quietly falls back to the placeholder and
 *    logs a warning, so a typo never breaks the experience.
 *
 *  The introduction book's text lives in content/book.md.
 */

export default {
  meta: {
    title: 'A parcel for you',
    description: 'A small hand-made parcel. Cut the tape and see what is inside.',
  },

  /** Every piece of on-screen text. */
  text: {
    loading: 'unpacking…',
    instruction: 'Hold and drag to cut the tape.',
    instructionTouch: 'Press and drag along the tape to cut it.',
    keepGoing: 'keep going…',
    keyboardCut: 'Hold → to cut the tape',
    tapeLabel: 'Packing tape. Hold the right arrow key to cut along it.',
    questionLabel: 'Look inside the box',
    bookLabel: 'Open the little book',
    bookTitle: 'About me',
    ownerLine: 'this little book belongs to',
    ownerName: '[your name]',
    readerHint: 'drag a page corner, or use ← →',
    readerHintTouch: 'swipe, or drag a page corner',
    photoCaption: '', // a handwritten caption under your photo, e.g. "me, last summer"
    closeBook: 'Close the book',
    bookError: 'This book could not be opened right now. Please try again later.',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    mute: 'Mute sound',
    unmute: 'Turn sound on',
    restart: 'Start again with a sealed parcel',
  },

  /**
   * Artwork layers. Keep the proportions noted beside each one (any size is
   * fine as long as the ratio matches; 3× the listed size looks crisp).
   * SVG, PNG, JPG and WebP all work.
   */
  art: {
    boxFront: 'assets/placeholders/box-front.svg', // 420 × 220 — front and back walls, outside
    boxSide: 'assets/placeholders/box-side.svg', // 300 × 220 — left and right walls, outside
    flapLong: 'assets/placeholders/flap-long.svg', // 420 × 150 — the two long top flaps, outside
    flapShort: 'assets/placeholders/flap-short.svg', // 300 × 150 — the two short top flaps, outside
    boxInside: 'assets/placeholders/box-inside.svg', // 420 × 220 — inner walls and flap undersides
    boxFloor: 'assets/placeholders/box-floor.svg', // 420 × 300 — the floor inside the box
    bookCover: 'assets/placeholders/book-cover.svg', // 360 × 500 — front cover of the little book
    endpaper: 'assets/placeholders/endpaper.svg', // 360 × 500 — inside of the cover
    questionMark: 'assets/placeholders/question-mark.svg', // ~200 × 280, transparent background
    instruction: '', // optional: a transparent image of your handwritten instruction
  },

  /** Your picture, shown as a photo card inside the box. */
  photo: {
    src: 'assets/placeholders/photo.svg', // portrait, about 4 : 5
    alt: '[Describe your photo for screen-reader users]',
  },

  /**
   * Handwriting. Leave `font` empty to use the bundled Caveat font, or point
   * it at your own handwriting font (.woff2 / .woff / .ttf / .otf).
   */
  handwriting: {
    font: '',
  },

  textures: {
    paper: 'assets/textures/paper.png',
    grain: 'assets/textures/grain.png',
  },

  cursors: {
    knife: 'assets/ui/knife.svg',
    knifePressed: 'assets/ui/knife-pressed.svg',
    knifeFallback: 'assets/ui/knife.png',
    hand: 'assets/ui/hand.svg',
    handFallback: 'assets/ui/hand.png',
  },

  sounds: {
    cut: 'assets/sounds/tape-cut.wav', // must loop seamlessly
    flap: 'assets/sounds/flap.wav',
    reveal: 'assets/sounds/reveal.wav',
    whoosh: 'assets/sounds/whoosh.wav',
    page: 'assets/sounds/page.wav',
    tap: 'assets/sounds/tap.wav',
  },

  book: {
    source: 'content/book.md',
  },
};
