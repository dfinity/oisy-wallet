import type { BitcoinAddressType, PaymentType } from '$declarations/signer/signer.did';
import { BACKEND_CANISTER_PRINCIPAL } from '$lib/constants/app.constants';

export const P2WPKH: BitcoinAddressType = { P2WPKH: null };

export const SIGNER_PAYMENT_TYPE: PaymentType = {
	PatronPaysIcrc2Cycles: {
		owner: BACKEND_CANISTER_PRINCIPAL,
		subaccount: []
	}
};

// What the backend counts per signature when it sizes the OISY allowance: one signer fee and one
// ledger fee (`SIGNER_FEE` + `LEDGER_FEE` in `src/backend/src/signer/service.rs`). Real charges vary
// by call, so a number of signatures from it is an estimate.
export const SIGNER_CALL_ESTIMATED_CYCLES = 81_000_000_000n;
