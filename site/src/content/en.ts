// Every visible word of the homepage and /press (English; Spanish comes with the app's Spanish release).
// The pages hold no prose. test/unit/site-copy.test.ts holds this file to the public rules of the
// positioning decision: no technical words, no other app's name, record-keeping only, no dates on the
// roadmap, the proof points verbatim and in order.

/** The App Store description's closing sentence, verbatim. The only place "diagnose" and "treat" appear. */
export const DISCLAIMER = "My Pets is a record-keeping app. It does not diagnose or treat. Always follow your veterinarian's advice.";

export const SITE = {
  name: 'My Pets',
  fullName: 'My Pets: Pet Health Records',
  developer: 'Binary Bridges',
  url: 'https://pets.binarybridges.co',
  host: 'pets.binarybridges.co',
  skip: 'Skip to content',
  navLabel: 'Main',
  nav: { home: 'Home', roadmap: 'Roadmap', faq: 'FAQ', press: 'Press' },
  footerLine: 'My Pets is made by Binary Bridges.',
  footerPress: 'Press kit',
  footerHome: 'My Pets home',
} as const;

export const PROMISE = {
  headline: 'Every dose on time, every record yours.',
  accent: 'every record yours',
  tail: 'One payment, no subscription.',
} as const;

export const HOME = {
  title: 'My Pets: every dose on time, every record yours',
  description:
    "My Pets keeps your dog's or cat's health record on your iPhone and in your iCloud, with dose alarms that ring even on silent. One payment, no subscription.",
  hero: {
    label: '00 / My Pets for iPhone and iPad',
    lead: 'A health record for dogs and cats, built for pets that take medication every day and for the people who give it.',
    previewCaption: 'The 24-second preview: My Pets in use.',
    previewLater: 'The preview video arrives with the App Store listing.',
    iconAlt: '',
    roadmapLink: 'See the roadmap',
  },
  proof: {
    label: '01 / What it does',
    heading: 'Four things My Pets does for you.',
  },
  price: {
    label: '02 / Price',
    heading: 'Pay once. Keep it.',
  },
  privacy: {
    label: '03 / Privacy',
    heading: "Your pet's data stays yours.",
  },
  origin: {
    label: '04 / Why it exists',
    heading: 'Two problems a vet nurse kept seeing.',
  },
  roadmap: {
    label: '05 / Roadmap',
  },
  faq: {
    label: '06 / Questions',
  },
} as const;

export const PROOF_POINTS = [
  {
    kicker: 'Doses',
    text: 'Say what the vet said. My Pets drafts the dose plan for you to check, then sets the alarms. They ring even on silent.',
  },
  {
    kicker: 'Records',
    text: 'A record you own and your vet can verify, on your iPhone and in your iCloud.',
  },
  {
    kicker: 'Cost',
    text: 'No account, no subscription, one payment.',
  },
  {
    kicker: 'If they get lost',
    text: 'Lost mode in two taps.',
  },
] as const;

export const PRICE = {
  coverage:
    'One payment covers My Pets on iPhone, iPad and Mac, with all its updates. Android and the clinic app will be separate products, also without subscriptions.',
  comparison: {
    text: 'Pet health apps with subscriptions charge about US$20-50 a year.',
    mark: '1',
    note: 'Typical yearly prices of pet health record apps on the US App Store, checked November 2026.',
    noteLabel: 'Source',
  },
} as const;

export const PRIVACY = {
  body: "Your pet's data never goes to a Binary Bridges server. Records stay on your iPhone and in your own iCloud, except the lost-pet card you choose to publish in lost mode. There is no account to create.",
  site: 'This site sets no cookies and stores nothing.',
  siteLabel: 'This website',
} as const;

export const ORIGIN = {
  story:
    'In her first year as a vet nurse, my wife kept seeing the same two problems: medication given wrong and vaccines forgotten. My Pets is my answer to both: every dose on time, and a record that stays with the family.',
  signature: 'The developer of My Pets, Binary Bridges',
} as const;

export const ROADMAP = {
  heading: 'Where My Pets is going.',
  lead: 'No dates: each item ships when it is ready. The roadmap describes plans, not features of the current app.',
  groups: [
    { name: 'Now', items: [{ text: 'iPhone and iPad' }] },
    {
      name: 'Next',
      items: [{ text: 'Spanish' }, { text: 'Mac' }, { text: 'Sitters can mark doses' }, { text: 'Apple Watch (mark a dose from the wrist)' }],
    },
    {
      name: 'Later',
      items: [
        { text: 'Android' },
        {
          text: 'The open record format for apps and devices',
          note: "Today your pet's feeder, fountain, tracker and vet each keep their own data. We are opening My Pets' record format so any app or device can share information about your pet, only with your permission.",
        },
        { text: 'A page where vets check a record' },
        { text: 'Bring your records in (from other apps or a photo of the paper vaccination card)' },
      ],
    },
    {
      name: 'Exploring',
      items: [
        { text: 'A clinic app with no subscription' },
        { text: 'Open prototype devices that use the format' },
        { text: 'Satellite help for lost pets', note: 'Helping find lost pets where there is no cell signal, with open collar devices.' },
      ],
    },
  ],
} as ReadonlyDeep<{ heading: string; lead: string; groups: { name: string; items: { text: string; note?: string }[] }[] }>;

/** An answer of 'DISCLAIMER' renders the DISCLAIMER constant. */
export const FAQ = {
  heading: 'Questions, answered.',
  items: [
    { q: 'Does My Pets replace my vet?', a: 'DISCLAIMER' },
    {
      q: "Where is my pet's data?",
      a: 'On your iPhone and in your own iCloud. It never goes to a Binary Bridges server. The one exception is the lost-pet card you choose to publish in lost mode.',
    },
    { q: 'Do I need an account?', a: 'No. There is no account to create: My Pets uses the iCloud you already have.' },
    {
      q: 'What does the one payment cover?',
      a: 'My Pets on iPhone, iPad and Mac, with all its updates. Android and the clinic app will be separate products, also without subscriptions.',
    },
    {
      q: 'What happens after the launch price?',
      a: 'My Pets then costs US$19.99, still one payment with no subscription. Anyone who bought at the launch price keeps the app and all its updates.',
    },
    {
      q: 'How does my vet check a record?',
      a: 'Export the vaccination card or the full history as a PDF your vet can verify. Entries can be corrected but never quietly changed or deleted, so the history stays complete.',
    },
    {
      q: 'Do the alarms ring on silent?',
      a: 'Yes. Dose alarms sound even when your iPhone is on silent. Mark a dose as given from the alarm, a widget, the Lock Screen or Siri.',
    },
    {
      q: 'What is lost mode?',
      a: 'If your pet goes missing, two taps publish a lost-pet card with only what you choose to show. A collar tag with a QR code or NFC chip leads the finder to it.',
    },
    { q: 'Is My Pets on Android?', a: 'Not yet. Android is on the roadmap, as a separate product, also without a subscription.' },
  ],
} as const;

export const PRESS = {
  title: 'Press kit: My Pets',
  description: 'Facts, images and contact for writing about My Pets, the pet health record app for iPhone with one payment and no subscription.',
  label: '00 / Press kit',
  heading: 'My Pets, for the press.',
  lead: 'Everything you need to write about My Pets without emailing first.',
  sections: {
    about: '01 / About the app',
    facts: '02 / Fact sheet',
    media: '03 / Screenshots and video',
    icon: '04 / App icon',
    privacy: '05 / Privacy',
    developer: '06 / Developer note',
    contact: '07 / Promo codes',
  },
  headings: {
    about: 'About My Pets',
    facts: 'Fact sheet',
    media: 'Screenshots and video',
    icon: 'App icon',
    privacy: 'Privacy',
    developer: 'From the developer',
    contact: 'Promo codes',
  },
  about: [
    'Every dose on time, every record yours.',
    "My Pets keeps your dog's or cat's health record on your iPhone: medications, vaccines, vet visits, allergies, weight and daily notes. It is built for pets that take medication every day, and for the people who give it.",
    'Say what the vet said. Dictate or type the instructions you got at the clinic, such as "5 drops every 12 hours for 10 days". My Pets drafts the medication plan for you to check, then sets the dose alarms, right on your iPhone.',
    'Dose alarms sound even in silent mode. Mark a dose as given from the alarm, a widget, the Lock Screen or Siri. A Live Activity shows the next dose.',
    'Entries in the record are never changed or deleted, only corrected, so the history stays complete. Export the vaccination card or the full history as a PDF your vet can verify.',
    'Give a family member, sitter or vet a read-only copy that stays up to date. They can see and verify the record, never change it.',
    'An emergency card is two taps away. If your pet goes missing, lost mode publishes only what you choose, and a collar tag with a QR code or NFC chip leads the finder to it. A trip checklist collects the vaccines and documents a trip needs.',
    'No account and no Binary Bridges server. Your records live on your iPhone and in your private iCloud. One payment, no subscription, no limits on pets or records.',
  ],
  facts: {
    name: ['Name', 'My Pets: Pet Health Records'],
    developer: ['Developer', 'Binary Bridges SAS'],
    platforms: ['Platforms', 'iPhone and iPad'],
    category: ['Category', 'Medical'],
    language: ['Language', 'English'],
    price: 'Price',
    release: 'Release date',
    releaseUnknown: 'To be announced',
    website: 'Website',
  },
  mediaEmpty: 'Screenshots and the preview video will be here at launch.',
  videoLabel: 'Preview video',
  icon: {
    alt: 'The My Pets app icon: the Bridge cat',
    light: 'Download the icon (light, SVG)',
    dark: 'Download the icon (dark, SVG)',
  },
  privacy:
    "Your pet's data never goes to a Binary Bridges server. Records stay on the owner's iPhone and in their own iCloud, except the lost-pet card they choose to publish in lost mode. There is no account to create, and this website sets no cookies and stores nothing.",
} as const;


type ReadonlyDeep<T> = T extends (infer U)[] ? readonly ReadonlyDeep<U>[] : T extends object ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> } : T;
