import type {
	SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
	SolanaError
} from '@solana/kit';

type PreflightContext = Omit<
	SolanaError<
		typeof SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE
	>['context'],
	'__code'
>;

export const mockPreflightContext = (
	overrides: Partial<PreflightContext> & ErrorOptions = {}
): PreflightContext & ErrorOptions => ({
	accounts: null,
	returnData: null,
	loadedAccountsDataSize: null,
	logs: null,
	unitsConsumed: null,
	replacementBlockhash: null,
	...overrides
});
