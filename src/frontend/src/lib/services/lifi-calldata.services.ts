import { LIFI_DIAMOND_ADDRESSES } from '$env/rest/lifi.env';
import { infuraLifiProviders } from '$eth/providers/infura-lifi.providers';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import { assertLifiCalldata } from '$lib/utils/lifi-calldata.utils';
import { isNullish } from '@dfinity/utils';
import type { LiFiStep, QuoteRequestFromAmount } from '@lifi/sdk';

/**
 * Refuses an EVM LI.FI transaction unless its calldata does what the request asked
 * (`assertLifiCalldata`) and every call its swaps make through the Diamond is on the Diamond's own
 * whitelist. The Diamond would revert on a call off the whitelist anyway; checking first turns that
 * revert into a refusal before signing, and makes explicit that OISY relies on LI.FI's whitelist
 * governance rather than on the unsigned quote.
 *
 * Run on the execution-time quote, the one whose bytes are signed. A failed read of the whitelist
 * refuses the swap too: the check fails closed.
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
		throw new LifiQuoteRejectedError(
			'LI.FI calldata rejected: no Diamond is pinned for the network'
		);
	}

	const calls = assertLifiCalldata({
		quote,
		request,
		diamond,
		displayedToAmountMin,
		userTokenAddresses
	});

	const { isContractSelectorWhitelisted } = infuraLifiProviders(sourceNetworkId);

	const whitelisted = await Promise.all(
		calls.map(({ contract, selector }) =>
			isContractSelectorWhitelisted({ diamond, contract, selector })
		)
	);

	if (whitelisted.some((allowed) => !allowed)) {
		throw new LifiQuoteRejectedError(
			'LI.FI calldata rejected: a swap call is not on the Diamond whitelist'
		);
	}
};
