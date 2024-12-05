import type { SelectedUtxosFeeResponse } from '$declarations/backend/backend.did';

export class BtcAmountAssertionError extends Error {}

export type UtxosFee = Omit<SelectedUtxosFeeResponse, 'fee_satoshis'> & {
	feeSatoshis: SelectedUtxosFeeResponse['fee_satoshis'];
};
