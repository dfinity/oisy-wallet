import { ADDITIONAL_ICRC_TOKENS_INDEXED } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.env';
import { RETIRED_ICRC_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.retired.env';
import { DIP20_BUILTIN_TOKENS_INDEXED } from '$env/tokens/tokens.dip20.env';
import { SUPPORTED_ICP_TOKENS_INDEXED } from '$env/tokens/tokens.icp.env';
import { SNS_BUILTIN_TOKENS_INDEXED } from '$env/tokens/tokens.sns.env';
import { Principal } from '@icp-sdk/core/principal';

describe('tokens.icrc.retired.env', () => {
	// The list is matched against the ledger ID text of a saved token: an ID in any other form never matches.
	it.each(RETIRED_ICRC_LEDGER_CANISTER_IDS)(
		'should hold %s as a canonical principal text',
		(ledgerCanisterId) => {
			expect(Principal.fromText(ledgerCanisterId).toText()).toBe(ledgerCanisterId);
		}
	);

	// A retired ledger is skipped on load: one that is listed again would never show up.
	it('should not hold a ledger that OISY lists', () => {
		const listedLedgerCanisterIds = [
			...Object.keys(SUPPORTED_ICP_TOKENS_INDEXED),
			...Object.keys(SNS_BUILTIN_TOKENS_INDEXED),
			...Object.keys(DIP20_BUILTIN_TOKENS_INDEXED),
			...Object.keys(ADDITIONAL_ICRC_TOKENS_INDEXED),
			...ICRC_TOKENS.map(({ ledgerCanisterId }) => ledgerCanisterId)
		];

		expect(
			RETIRED_ICRC_LEDGER_CANISTER_IDS.filter((ledgerCanisterId) =>
				listedLedgerCanisterIds.includes(ledgerCanisterId)
			)
		).toEqual([]);
	});
});
