import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { ADDITIONAL_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { ICRC_CK_TOKENS, PUBLIC_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import { ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { SUPPORTED_ICP_TOKENS } from '$env/tokens/tokens.icp.env';
import { SNS_BUILTIN_TOKENS } from '$env/tokens/tokens.sns.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SUPPORTED_XRP_TOKENS } from '$env/tokens/tokens.xrp.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import {
	CUSTOM_NAMES_BY_LEDGER_CANISTER_ID,
	CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID
} from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';
import { nonNullish, notEmptyString } from '@dfinity/utils';

export type ListedTokenLabel = Pick<Token, 'symbol' | 'name' | 'oisySymbol' | 'oisyName'>;

// The symbol and name OISY shows in place of a listed ledger's own, where it has one.
const shownLabels = (
	ledgerCanisterId: LedgerCanisterIdText
): Pick<ListedTokenLabel, 'oisySymbol' | 'oisyName'> => {
	const oisySymbol = CUSTOM_SYMBOLS_BY_LEDGER_CANISTER_ID[ledgerCanisterId];
	const oisyName = CUSTOM_NAMES_BY_LEDGER_CANISTER_ID[ledgerCanisterId];

	return {
		...(nonNullish(oisySymbol) && { oisySymbol: { oisySymbol } }),
		...(nonNullish(oisyName) && { oisyName: { oisyName } })
	};
};

const twinTokenSymbol = (token: Token | undefined): string | undefined =>
	nonNullish(token) && 'twinTokenSymbol' in token && typeof token.twinTokenSymbol === 'string'
		? token.twinTokenSymbol
		: undefined;

/**
 * The Internet Computer ledgers OISY lists, as known without loading anything: ICP, the ck tokens,
 * the SNS tokens and the other ICRC tokens it ships.
 */
export const LISTED_ICRC_LEDGER_CANISTER_IDS: ReadonlySet<LedgerCanisterIdText> = new Set([
	...SUPPORTED_ICP_TOKENS.map(({ ledgerCanisterId }) => ledgerCanisterId),
	...ICRC_TOKENS.map(({ ledgerCanisterId }) => ledgerCanisterId),
	...SNS_BUILTIN_TOKENS.map(({ ledgerCanisterId }) => ledgerCanisterId)
]);

/**
 * The symbols and names of those ledgers and of the native coins of the other networks, as known
 * without loading anything, with the symbol or name OISY shows in place of a ledger's own. A ck
 * token's own name is only on its ledger, so its symbol, which its twin token names, stands in for
 * both.
 */
export const LISTED_TOKEN_LABELS: readonly ListedTokenLabel[] = [
	...[...SUPPORTED_ICP_TOKENS, ...SNS_BUILTIN_TOKENS, ...ADDITIONAL_ICRC_TOKENS].map(
		({ symbol, name, ledgerCanisterId }) => ({ symbol, name, ...shownLabels(ledgerCanisterId) })
	),
	...[
		...SUPPORTED_BITCOIN_TOKENS,
		...SUPPORTED_ETHEREUM_TOKENS,
		...SUPPORTED_SOLANA_TOKENS,
		...SUPPORTED_XRP_TOKENS,
		...SUPPORTED_EVM_TOKENS
	].map(({ symbol, name }) => ({ symbol, name })),
	...[...PUBLIC_ICRC_TOKENS, ...ICRC_CK_TOKENS]
		.map(({ twinToken }) => twinTokenSymbol(twinToken))
		.filter((symbol): symbol is string => notEmptyString(symbol))
		.map((symbol) => ({ symbol, name: symbol }))
];
