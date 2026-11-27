import { ICRC_CK_TOKENS, PUBLIC_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import { ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	LISTED_ICRC_LEDGER_CANISTER_IDS,
	LISTED_TOKEN_LABELS
} from '$env/tokens/tokens.listed.env';
import { SNS_BUILTIN_TOKENS } from '$env/tokens/tokens.sns.env';
import { nonNullish } from '@dfinity/utils';

describe('tokens.listed.env', () => {
	it('should list the ICP ledger, the ICRC tokens and the SNS tokens', () => {
		expect(LISTED_ICRC_LEDGER_CANISTER_IDS.has(ICP_TOKEN.ledgerCanisterId)).toBeTruthy();

		[...ICRC_TOKENS, ...SNS_BUILTIN_TOKENS].forEach(({ ledgerCanisterId }) =>
			expect(LISTED_ICRC_LEDGER_CANISTER_IDS.has(ledgerCanisterId)).toBeTruthy()
		);
	});

	it.each(['ICP', 'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'POL'])(
		'should know the symbol %s',
		(symbol) => {
			expect(LISTED_TOKEN_LABELS.some((label) => label.symbol === symbol)).toBeTruthy();
		}
	);

	it('should know the symbol of every ck token from its twin token', () => {
		const twinSymbols = [...PUBLIC_ICRC_TOKENS, ...ICRC_CK_TOKENS]
			.map(({ twinToken }) =>
				nonNullish(twinToken) && 'twinTokenSymbol' in twinToken
					? twinToken.twinTokenSymbol
					: undefined
			)
			.filter((symbol) => typeof symbol === 'string');

		expect(twinSymbols.length).toBeGreaterThan(0);

		twinSymbols.forEach((symbol) =>
			expect(LISTED_TOKEN_LABELS.some((label) => label.symbol === symbol)).toBeTruthy()
		);
	});
});
