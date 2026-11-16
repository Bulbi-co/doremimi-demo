/*
 * The app's 24-px icons, copied unchanged from Doremimi/Themes/Palette.axaml:133-170 (dossier ch. 10, T-09). Their
 * path syntax is valid SVG as it stands. All of them draw even-odd: Avalonia's StreamGeometry fills even-odd by
 * default, which is why the ♯ quick tile on 01-home.png shows holes where its bars cross. (T-09 names only IconLock
 * and IconErase; the screenshot shows the rule is wider.)
 */
export const ICONS = {
  IconHome: 'M3,11 L12,3 L21,11 L19,11 L19,21 L14,21 L14,15 L10,15 L10,21 L5,21 L5,11 Z',
  IconPlay: 'M7,3.5 L20.5,12 L7,20.5 Z',
  IconCards: 'M3,7 L14,6 L15,21 L4,22 Z M8,3 L20,2.5 L20.5,17 L17,17.2 L16.4,5 L8.1,5.4 Z',
  IconGrid: 'M3,3 H10 V10 H3 Z M14,3 H21 V10 H14 Z M3,14 H10 V21 H3 Z M14,14 H21 V21 H14 Z',
  IconHelp: 'M12,2 A10,10 0 1 1 11.99,2 Z M11,16 V18.5 H13.2 V16 Z M12,5.5 C9.6,5.5 8.2,7 8.1,9 H10.4 C10.5,8.1 11.1,7.6 12,7.6 C13,7.6 13.6,8.2 13.6,9 C13.6,10.6 11,10.6 11,13.6 V14.4 H13.2 V13.9 C13.2,12 16,11.7 16,9 C16,7 14.4,5.5 12,5.5 Z',
  IconStar: 'M12,1.5 L15.1,8.3 L22.5,9.1 L17,14.1 L18.5,21.5 L12,17.8 L5.5,21.5 L7,14.1 L1.5,9.1 L8.9,8.3 Z',
  IconNote: 'M10,3.5 L20.5,1.5 L20.5,15.5 A3.2,3.2 0 1 1 18.3,12.5 L18.3,6 L12.2,7.2 L12.2,17.5 A3.2,3.2 0 1 1 10,14.5 Z',
  IconPencil: 'M15.5,3.5 L20.5,8.5 L9,20 L3,21 L4,15 Z M14,7 L17,10 L18.5,8.5 L15.5,5.5 Z M5.6,16.2 L5.1,18.9 L7.8,18.4 Z',
  IconEye: 'M12,5 C6,5 2,12 2,12 C2,12 6,19 12,19 C18,19 22,12 22,12 C22,12 18,5 12,5 Z M12,8.5 A3.5,3.5 0 1 1 11.99,8.5 Z',
  IconCheck: 'M3.5,12.5 L9,18 L20.5,6.5 L18,4 L9,13 L6,10 Z',
  IconCross: 'M5,3 L12,10 L19,3 L21,5 L14,12 L21,19 L19,21 L12,14 L5,21 L3,19 L10,12 L3,5 Z',
  IconReplay: 'M12,4 A8,8 0 1 1 4.2,13.8 L6.6,13.2 A5.6,5.6 0 1 0 12,6.4 V9.5 L7,5.2 L12,1 Z',
  IconArrow: 'M4,10.5 H15 L11,6.5 L13,4.5 L20.5,12 L13,19.5 L11,17.5 L15,13.5 H4 Z',
  IconBook: 'M3,4.5 C5.5,3 9,3 11,4.6 V20.5 C9,19 5.5,19 3,20 Z M13,4.6 C15,3 18.5,3 21,4.5 V20 C18.5,19 15,19 13,20.5 Z',
  IconHeart: 'M12,21 L10.6,19.7 C5.4,15 2,12 2,8.3 C2,5.3 4.4,3 7.4,3 C9.1,3 10.8,3.8 12,5.1 C13.2,3.8 14.9,3 16.6,3 C19.6,3 22,5.3 22,8.3 C22,12 18.6,15 13.4,19.7 Z',
  IconSharp: 'M8,2 H10.5 V22 H8 Z M14,1 H16.5 V21 H14 Z M4,8.6 L20,5.4 V8.4 L4,11.6 Z M4,15.6 L20,12.4 V15.4 L4,18.6 Z',
  IconBack: 'M15.5,3.5 L17.5,5.5 L11,12 L17.5,18.5 L15.5,20.5 L7,12 Z',
  IconChevronRight: 'M8.5,3.5 L17,12 L8.5,20.5 L6.5,18.5 L13,12 L6.5,5.5 Z',
  IconLock: 'M5,10 H7 V7 A5,5 0 0 1 17,7 V10 H19 V22 H5 Z M9.5,10 H14.5 V7 A2.5,2.5 0 0 0 9.5,7 Z M11,14 V18.5 H13 V14 Z',
  IconErase: 'M8,4 H22 V20 H8 L1.5,12 Z M11,9.6 L12.1,8.5 L14.5,10.9 L16.9,8.5 L18,9.6 L15.6,12 L18,14.4 L16.9,15.5 L14.5,13.1 L12.1,15.5 L11,14.4 L13.4,12 Z',
  IconUsers: 'M9,4 A4,4 0 1 1 8.99,4 Z M1,21 C1,16 5,14 9,14 C13,14 17,16 17,21 Z M17,5 A3,3 0 1 1 16.99,5 Z M18.6,13.2 C21.2,13.8 23,15.6 23,19 H18.8 C18.8,16.8 18.5,14.8 18.6,13.2 Z',
  IconInfo: 'M12,2 A10,10 0 1 1 11.99,2 Z M10.8,10 H13.2 V17.5 H10.8 Z M10.8,6 H13.2 V8.4 H10.8 Z',
  IconPalette: 'M12,2 C6.5,2 2,6.2 2,11.5 C2,16.5 6,20 10.5,20 C12,20 12.6,19 12.2,17.8 C11.8,16.6 12.6,15.5 14,15.5 H16.5 C19.5,15.5 22,13.5 22,10.5 C22,5.8 17.5,2 12,2 Z M6.5,12.5 A1.6,1.6 0 1 1 6.49,12.5 Z M8.5,7.5 A1.6,1.6 0 1 1 8.49,7.5 Z M13.5,6 A1.6,1.6 0 1 1 13.49,6 Z M17.5,9 A1.6,1.6 0 1 1 17.49,9 Z',
  IconBulb: 'M12,2 A7,7 0 0 1 16.5,14.4 V17 H7.5 V14.4 A7,7 0 0 1 12,2 Z M8.5,18.5 H15.5 V20 H8.5 Z M10,21 H14 V22.5 H10 Z',
  IconMic: 'M12,2 A4,4 0 0 1 16,6 V11 A4,4 0 0 1 8,11 V6 A4,4 0 0 1 12,2 Z M5,10 H7 A5,5 0 0 0 17,10 H19 A7,7 0 0 1 13,16.9 V20 H16 V22 H8 V20 H11 V16.9 A7,7 0 0 1 5,10 Z',
  IconSmile: 'M12,2 A10,10 0 1 1 11.99,2 Z M9,7.5 A1.6,1.6 0 1 1 8.99,7.5 Z M15,7.5 A1.6,1.6 0 1 1 14.99,7.5 Z M7,13 H17 A5,5 0 0 1 7,13 Z',
  IconGlobe: 'M12,2 A10,10 0 1 1 11.99,2 Z M12,4.2 C10.2,6.6 9.4,9.2 9.4,12 C9.4,14.8 10.2,17.4 12,19.8 C13.8,17.4 14.6,14.8 14.6,12 C14.6,9.2 13.8,6.6 12,4.2 Z',
  IconBell: 'M12,2 C8.5,2 6,4.7 6,8 V13 L4,16 V17 H20 V16 L18,13 V8 C18,4.7 15.5,2 12,2 Z M9.5,18.5 H14.5 A2.5,2.5 0 0 1 9.5,18.5 Z',
  // The hub's rows (Daha fazla's today, ShellView.axaml:581-621) need these six; Palette.axaml:150-170, unchanged.
  IconBolt: 'M13,1 L4,14 H11 L9,23 L20,9 H13 Z',
  IconHand: 'M2,13 H6 V22 H2 Z M7,13.5 L11,12 C12,11.7 13,12 13.5,12.8 L14,14 H10 V15.5 H16 L20,13 C21,12.5 22,13.2 21.6,14.2 L18,19 C17.3,19.8 16.4,20.2 15.4,20.2 H7 Z M15,2.5 C16,1.5 18,1.6 18.6,3 C19.2,1.6 21.2,1.5 22,2.6 C23,4 21.5,6 18.6,8.5 C15.7,6 14.2,4 15,2.5 Z',
  IconMail: 'M2,4.5 H22 V19.5 H2 Z M4,7 V8.6 L12,14 L20,8.6 V7 L12,12.4 Z',
  IconPhone: 'M6.6,2 L10,5.4 L8.2,8.4 C9.3,10.9 13.1,14.7 15.6,15.8 L18.6,14 L22,17.4 L20,21.5 C12,21.8 2.2,12 2.5,4 Z',
  IconCamera: 'M3,7 H7 L9,4 H15 L17,7 H21 V20 H3 Z M12,9 A4.5,4.5 0 1 0 12.01,9 Z',
  // Not in Palette.axaml: the song page's Duraklat draws its own two bars there; the same two bars, drawn here.
  IconPause: 'M6,4 H10 V20 H6 Z M14,4 H18 V20 H14 Z',
  IconExternal: 'M14,3 H21 V10 L18.5,7.5 L12,14 L10,12 L16.5,5.5 Z M5,5 H11 V7 H7 V17 H17 V13 H19 V19 H5 Z',
};

/** An inline SVG for an icon; `cls` sizes it from CSS, the fill is currentColor. */
export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}" fill-rule="evenodd"/></svg>`;
