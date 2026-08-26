/**
 * What the in-app confirmation shows after a tip has been claimed.
 *
 * Finished display values rather than raw data, and deliberately so: the claim
 * runs on the standalone claim page, which is where the ledger metadata was
 * fetched, and the confirmation renders inside the wallet after a navigation.
 * Handing over the formatted label means the modal cannot re-derive it — and so
 * cannot print base units as if they were money when the metadata never arrived.
 *
 * Carries nothing secret. The claim code is spent by the time this exists and
 * has no business travelling into the app.
 */
export interface TipReceipt {
	amountLabel?: string;
	symbol?: string;
	logo?: string;
	message?: string;
}
