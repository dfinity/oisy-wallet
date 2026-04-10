import { TICRC1_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { CK_LEDGER_CANISTER_TESTNET_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';

export const ICRC_LEDGER_CANISTER_TESTNET_IDS = [
	...CK_LEDGER_CANISTER_TESTNET_IDS,
	TICRC1_LEDGER_CANISTER_ID
];
