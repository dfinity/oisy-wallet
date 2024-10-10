import type { PaymentType } from '$declarations/signer/signer.did';
import { BACKEND_CANISTER_PRINCIPAL } from '$lib/constants/app.constants';

export const SIGNER_PAYMENT_TYPE: PaymentType = {
	PatronPaysIcrc2Cycles: {
		owner: BACKEND_CANISTER_PRINCIPAL,
		subaccount: []
	}
};
