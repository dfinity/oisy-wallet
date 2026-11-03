import { LIFI_DIAMOND_ADDRESSES } from '$env/rest/lifi.env';
import { infuraLifiProviders, type InfuraLifiProvider } from '$eth/providers/infura-lifi.providers';
import type { EthAddress } from '$eth/types/address';
import { ZERO } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
import { assertLifiCalldata, lifiCalldataSwapTargets } from '$lib/utils/lifi-calldata.utils';
import { lifiRejectedError } from '$lib/utils/lifi-swap.utils';
import { isNullish } from '@dfinity/utils';
import type { LiFiStep, QuoteRequestFromAmount } from '@lifi/sdk';

/**
 * Of the user's tokens, those a call through the Diamond could spend: the ones with an allowance to
 * it. A token whose allowance cannot be read counts among them.
 */
const approvedTokenAddresses = async ({
	tokenAddresses,
	owner,
	diamond,
	provider: { allowance }
}: {
	tokenAddresses: string[];
	owner: string;
	diamond: EthAddress;
	provider: InfuraLifiProvider;
}): Promise<string[]> => {
	const allowances = await Promise.allSettled(
		tokenAddresses.map((token) => allowance({ token, owner, spender: diamond }))
	);

	return tokenAddresses.filter((_, index) => {
		const result = allowances[index];

		return result?.status !== 'fulfilled' || result.value > ZERO;
	});
};

/**
 * Refuses an EVM LI.FI transaction unless its calldata does what the request asked
 * (`assertLifiCalldata`) and every call its swaps make through the Diamond is on the Diamond's own
 * whitelist. The Diamond would revert on a call off the whitelist anyway; checking first turns that
 * revert into a refusal before signing, and makes explicit that OISY relies on LI.FI's whitelist
 * governance rather than on the unsigned quote.
 *
 * `userTokenAddresses` are the ERC-20s OISY knows on the source network, enabled or not: hiding a
 * token does not revoke its allowance. Those with an allowance to the Diamond are what a swap call
 * could spend, and may not be called. Their allowance is read only for the ones a swap step calls or
 * approves, the only ones it could refuse.
 *
 * Run on the quote whose bytes are signed, and before an ERC-20's approval on the one its price is
 * checked against. A failed read of the whitelist refuses the swap too: the check fails closed.
 */
export const assertLifiEvmCalldata = async ({
	quote,
	request,
	sourceNetworkId,
	displayedToAmountMin,
	userTokenAddresses
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
	sourceNetworkId: NetworkId;
	displayedToAmountMin: bigint;
	userTokenAddresses: string[];
}): Promise<void> => {
	const diamond = LIFI_DIAMOND_ADDRESSES[sourceNetworkId];

	if (isNullish(diamond)) {
		throw lifiRejectedError({
			subject: 'calldata',
			reason: 'no Diamond is pinned for the network'
		});
	}

	const provider = infuraLifiProviders(sourceNetworkId);

	const targets = new Set(
		lifiCalldataSwapTargets({ quote, request }).map((address) => address.toLowerCase())
	);

	const calls = assertLifiCalldata({
		quote,
		request,
		diamond,
		displayedToAmountMin,
		approvedTokenAddresses: await approvedTokenAddresses({
			tokenAddresses: userTokenAddresses.filter((address) => targets.has(address.toLowerCase())),
			owner: request.fromAddress,
			diamond,
			provider
		}),
		nowSeconds: BigInt(Math.floor(Date.now() / 1_000))
	});

	const { isContractSelectorWhitelisted } = provider;

	const whitelisted = await Promise.all(
		calls.map(({ contract, selector }) =>
			isContractSelectorWhitelisted({ diamond, contract, selector })
		)
	);

	if (whitelisted.some((allowed) => !allowed)) {
		throw lifiRejectedError({
			subject: 'calldata',
			reason: 'a swap call is not on the Diamond whitelist'
		});
	}
};
