// Every visible word of the homepage and /press (English; the app itself ships in English and Spanish).
// The pages hold no prose. test/unit/site-copy.test.ts holds this file to the public rules of the
// positioning decision: no technical words, no other app's name, record-keeping only, no dates on the
// roadmap, the proof points verbatim and in order, and the owner's decisions of 21 Nov 2026
// (my-pets-ios issue 312): iPhone only at 1.0, the QR code is what is checked, no pre-order, the assistant off.

/**
 * The one switch for the assistant ("Say what the vet said"). It ships in 1.0 only if the closed beta
 * reaches 80 % accuracy; the default is off (owner, 21 Nov 2026). Set it to true and nothing else: the
 * proof point and the press description follow, and the build and tests pass either way.
 */
export const ASSISTANT_SHIPS: boolean = false;

/** The dose copy in both states. The assistant's wording always names what it needs. */
export const DOSE_COPY = {
  off: {
    proof: "Enter the vet's plan once and My Pets sets the dose alarms. They ring even on silent.",
    press:
      "Enter the vet's plan once. Add a medication with its dose, how often and for how long, and My Pets schedules every dose and sets the dose alarms. Change the plan whenever the vet does; the history keeps both.",
  },
  on: {
    proof: 'Say what the vet said. My Pets drafts the dose plan for you to check, then sets the alarms. They ring even on silent. Requires Apple Intelligence.',
    press:
      'Say what the vet said. Dictate or type the instructions you got at the clinic, such as "5 drops every 12 hours for 10 days". My Pets drafts the medication plan for you to check, then sets the dose alarms, right on your iPhone. Requires Apple Intelligence.',
  },
} as const;

const doses = ASSISTANT_SHIPS ? DOSE_COPY.on : DOSE_COPY.off;

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
  tail: 'One payment. No subscription.',
} as const;

export const HOME = {
  title: 'My Pets: every dose on time, every record yours',
  description:
    "My Pets keeps your dog's or cat's health record on your iPhone and in your iCloud, with dose alarms that ring even on silent. One payment. No subscription.",
  hero: {
    label: '00 / My Pets for iPhone',
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
    text: doses.proof,
  },
  {
    kicker: 'Records',
    text: 'A record you own and anyone with My Pets can verify, on your iPhone and in your iCloud.',
  },
  {
    kicker: 'Cost',
    text: 'No account. One payment. No subscription.',
  },
  {
    kicker: 'If they get lost',
    text: 'Lost mode shows a finder only what you choose.',
  },
] as const;

export const PRICE = {
  coverage:
    'One payment covers My Pets on iPhone, with all its updates. Android and the clinic app will be separate products, also without subscriptions.',
  comparison: {
    text: 'Pet health apps with subscriptions charge about US$20-50 a year.',
    mark: '1',
    note: 'Typical yearly prices of pet health record apps on the US App Store, checked November 2026.',
    noteLabel: 'Source',
  },
} as const;

export const PRIVACY = {
  body: "No account, and no Binary Bridges server holds your records. They stay on your iPhone and in your own iCloud. The one exception is the lost-pet card you choose to publish in lost mode, with only what you choose to show.",
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
    { name: 'Now', items: [{ text: 'iPhone' }, { text: 'English and Spanish' }] },
    {
      name: 'Next',
      items: [{ text: 'iPad' }, { text: 'Mac' }, { text: 'Sitters can mark doses' }, { text: 'Apple Watch (mark a dose from the wrist)' }],
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
      a: 'On your iPhone and in your own iCloud. No account, and no Binary Bridges server holds your records. The one exception is the lost-pet card you choose to publish in lost mode.',
    },
    { q: 'Do I need an account?', a: 'No. There is no account to create: My Pets uses the iCloud you already have.' },
    {
      q: 'What does the one payment cover?',
      a: 'My Pets on iPhone, with all its updates. Android and the clinic app will be separate products, also without subscriptions.',
    },
    {
      q: 'What happens after the launch price?',
      a: 'My Pets then costs US$19.99. One payment. No subscription. Anyone who bought at the launch price keeps the app and all its updates.',
    },
    {
      q: 'How does my vet check a record?',
      a: 'Export the vaccination card as a PDF with a signed QR code that anyone with My Pets can scan to check it. Entries can be corrected but never quietly changed or deleted, so the history stays complete.',
    },
    {
      q: 'Do the alarms ring on silent?',
      a: 'Yes. Dose alarms sound even when your iPhone is on silent. Mark a dose as given from the alarm, a widget, the Lock Screen or Siri.',
    },
    {
      q: 'What is lost mode?',
      a: 'If your pet goes missing, lost mode publishes a lost-pet card with only what you choose to show. A collar tag with an NFC chip or a printed QR code leads the finder to it, with no app needed. Lost mode and the public card start working when My Pets is released.',
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
    doses.press,
    'Dose alarms sound even in silent mode. Mark a dose as given from the alarm, a widget, the Lock Screen or Siri. A Live Activity shows the next dose.',
    'Entries in the record are never changed or deleted, only corrected, so the history stays complete. Export the vaccination card as a PDF with a signed QR code that anyone with My Pets can scan to check it.',
    'Give a family member, sitter or vet a read-only copy that stays up to date. They can see the record, never change it.',
    'The emergency card keeps what a vet or a finder needs to know. If your pet goes missing, lost mode publishes only what you choose, and a collar tag with an NFC chip or a printed QR code leads the finder to it. A trip checklist collects the vaccines and documents a trip needs.',
    'No account, and no Binary Bridges server holds your records: they live on your iPhone and in your private iCloud. One payment. No subscription. No limits on pets or records.',
  ],
  facts: {
    name: ['Name', 'My Pets'],
    storeName: ['App Store name', 'My Pets: Pet Health Records'],
    developer: ['Developer', 'Binary Bridges SAS'],
    platforms: ['Platform', 'iPhone'],
    category: ['Category', 'Lifestyle'],
    language: ['Languages', 'English and Spanish'],
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
    "No account, and no Binary Bridges server holds the owner's records. They stay on the owner's iPhone and in their own iCloud, except the lost-pet card they choose to publish in lost mode. This website sets no cookies and stores nothing.",
} as const;


type ReadonlyDeep<T> = T extends (infer U)[] ? readonly ReadonlyDeep<U>[] : T extends object ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> } : T;
