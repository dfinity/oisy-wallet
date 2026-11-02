import { ICRC_DEFAULT_ENABLED_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';
import icrcTokens from '$env/tokens/tokens.icrc.json';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';

describe('tokens.icrc.env', () => {
	// One entry the schema rejects (e.g. a category tag it does not know) makes the
	// whole list fall back to empty, silently hiding every curated ICRC token.
	it('should parse every curated ICRC token', () => {
		expect(Object.keys(additionalIcrcTokens).sort()).toEqual(Object.keys(icrcTokens).sort());
	});

	it('should file TCYCLES under the Compute asset type', () => {
		expect(additionalIcrcTokens.TCYCLES?.tags).toEqual([
			{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.COMPUTE }
		]);
	});

	it('should enable TCYCLES by default', () => {
		expect(ICRC_DEFAULT_ENABLED_LEDGER_CANISTER_IDS).toContain(
			additionalIcrcTokens.TCYCLES?.ledgerCanisterId
		);
	});
});
