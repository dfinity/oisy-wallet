import type { Account } from '$declarations/signer/signer.did';
import { BACKEND_CANISTER_PRINCIPAL } from '$lib/constants/app.constants';

export const SIGNER_PAYMENT_TYPE = {
	PatronPaysIcrc2Cycles: {
		owner: BACKEND_CANISTER_PRINCIPAL,
		subaccount: []
	} as Account
};
