import type { LedgerCanisterIdText } from '$icp/types/canister';

// ICRC tokens OISY once listed whose ledger canister no longer runs an ICRC ledger.
// A user who enabled one keeps it in their saved token list, so OISY skips it on load instead of requesting a ledger that can only fail.
// The symbol and name are those of the removed entry: OISY cannot read them from the ledger anymore, and the user still needs to recognise the token.
export const RETIRED_ICRC_TOKENS: {
	ledgerCanisterId: LedgerCanisterIdText;
	symbol: string;
	name: string;
}[] = [
	{
		ledgerCanisterId: 'aiw2p-tyaaa-aaaam-aebyq-cai',
		symbol: 'vUSD',
		name: 'vUSD'
	},
	{
		ledgerCanisterId: 'eazb6-tqaaa-aaaar-qan2a-cai',
		symbol: 'ODINDOG•ID•YTTL•ODIN',
		name: 'ODINDOG•ID•YTTL•ODIN'
	},
	{
		ledgerCanisterId: '73f6j-5iaaa-aaaal-qsw4a-cai',
		symbol: 'BOT',
		name: 'BOTCOIN'
	}
];

export const RETIRED_ICRC_LEDGER_CANISTER_IDS: LedgerCanisterIdText[] = RETIRED_ICRC_TOKENS.map(
	({ ledgerCanisterId }) => ledgerCanisterId
);
