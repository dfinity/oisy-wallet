import { LOCAL, STAGING, TEST } from '$lib/constants/app.constants';

// XRP Ledger trust-line tokens (RLUSD and imported tokens), built across several PRs and tested on
// staging before they reach users. Off in unit tests too, so suite-wide token and balance
// expectations stay what they are until the flag is turned on everywhere; the tests of the
// feature itself switch it on.
export const XRP_TRUST_LINE_TOKENS_ENABLED = (LOCAL || STAGING) && !TEST;
