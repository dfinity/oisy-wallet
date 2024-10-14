import type { BitcoinAddressType, PaymentType } from '$declarations/signer/signer.did';
import { BACKEND_CANISTER_PRINCIPAL } from '$lib/constants/app.constants';

export const P2WPKH: BitcoinAddressType = { P2WPKH: null };

export const SIGNER_PAYMENT_TYPE: PaymentType = {
	PatronPaysIcrc2Cycles: {
		owner: BACKEND_CANISTER_PRINCIPAL,
		subaccount: []
	}
};
