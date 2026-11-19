import type { LedgerCanisterIdText } from '$icp/types/canister';

// ICRC tokens OISY once listed whose ledger canister no longer runs an ICRC ledger.
// A user who enabled one keeps it in their saved token list, so OISY skips it on load instead of requesting a ledger that can only fail.
export const RETIRED_ICRC_LEDGER_CANISTER_IDS: LedgerCanisterIdText[] = [
	// vUSD
	'aiw2p-tyaaa-aaaam-aebyq-cai',
	// ODINDOG•ID•YTTL•ODIN
	'eazb6-tqaaa-aaaar-qan2a-cai',
	// BOT
	'73f6j-5iaaa-aaaal-qsw4a-cai'
];
