// The claims the homepage and /press must not make, shared by the copy test and the built-page test.
/** Claims the app at 1.0 does not make (owner, 21 Nov 2026, my-pets-ios#312). Checked on the copy by test/unit/site-copy.test.ts and on the built pages by test/e2e/home.spec.ts. The first entry is the platform rule, which the roadmap's Next and Later groups are exempt from. */
export const WRONG_CLAIMS: [RegExp, string][] = [
  [/\biPad\b|\bMac\b/, 'iPhone only at 1.0: iPad and Mac only under the roadmap\'s Next or Later'],
  [/signed PDF|PDF (is|are) signed/i, 'the PDF is not signed, its QR code is'],
  [/(your|the|a) vet can (verify|check)/i, 'verification needs My Pets: say "anyone with My Pets"'],
  [/pre-?order/i, 'no pre-order'],
  [/two taps|\b\d+ taps?\b/i, 'no tap counts (never checked on a device)'],
  [/diagnos/i, 'record-keeping, never diagnosis (only the disclaimer says it)'],
  [/keeps? (your pet|them|pets?) healthy|detects?\b/i, 'the app does not keep pets healthy or detect anything'],
  [/(no|never goes to an?|a) Binary Bridges server(?! holds?)/i, 'say "no Binary Bridges server holds your records": the lost-pet card is a page on this site'],
  [/send (us )?(your |real )?(pet'?s? )?records/i, 'never ask for real pet records'],
];
