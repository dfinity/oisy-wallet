import { ADDITIONAL_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import { ICRC_CK_TOKENS, PUBLIC_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';
import snsTokens from '$env/tokens/tokens.sns.json';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcInterface } from '$icp/types/ic-token';
import { buildIcrcTokensMetadataEntries } from '$icp/utils/icrc-metadata.utils';
import { nonNullish } from '@dfinity/utils';
import type { IcrcTokenMetadataResponse } from '@icp-sdk/canisters/ledger/icrc';

export const ICRC_TOKENS: IcInterface[] = [
	...PUBLIC_ICRC_TOKENS,
	...ADDITIONAL_ICRC_TOKENS,
	...ICRC_CK_TOKENS
];

const additionalIcrcTokensMetadataEntries = buildIcrcTokensMetadataEntries(
	Object.values(additionalIcrcTokens)
		.filter(nonNullish)
		.map(({ ledgerCanisterId, icon, ...rest }) => ({
			...rest,
			ledgerCanisterId,
			icon: icon ?? `/icons/icrc/${ledgerCanisterId}.png`
		}))
);

const snsMetadataEntries = buildIcrcTokensMetadataEntries(
	(
		snsTokens as {
			ledgerCanisterId: string;
			metadata: {
				name: string;
				symbol: string;
				fee: { __bigint__: string };
				decimals: number;
			};
		}[]
	).map(
		({
			ledgerCanisterId,
			metadata: {
				name,
				symbol,
				fee: { __bigint__ },
				decimals
			}
		}) => ({
			ledgerCanisterId,
			name,
			symbol,
			fee: BigInt(__bigint__),
			decimals,
			icon: `/icons/sns/${ledgerCanisterId}.png`
		})
	)
);

// Metadata pseudo-responses for built-in ICRC tokens whose name, symbol, decimals
// and fee are already known at build time. Avoids redundant canister metadata() calls.
// The ckERC20 tokens are excluded because they have no static icons at all and their
// metadata is more complex than that of the other ICRC tokens (for example, twin-token properties).
// TODO: Add static icons for ckERC20 and include them in this list.
export const ICRC_TOKENS_METADATA: Map<LedgerCanisterIdText, IcrcTokenMetadataResponse> = new Map([
	...additionalIcrcTokensMetadataEntries,
	...snsMetadataEntries
]);
