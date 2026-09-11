import {
	NEAR_INTENTS_EXPLORER_URL,
	ONESEC_EXPLORER_URL,
	VELORA_EXPLORER_URL
} from '$env/explorers.env';
import type { HelpExplorerAddresses, HelpExplorerGroup, HelpExplorerLink } from '$lib/types/help';
import { SwapProvider } from '$lib/types/swap';
import { notEmptyString } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

// Display names for the three providers this card links to. Deliberately not read from
// `swapProvidersDetails`, whose NEAR Intents and 1Sec entries only exist while their swap
// flags are on - this card outlives those flags on purpose (see below). Proper nouns, so
// they stay out of the i18n files.
export const HELP_EXPLORER_PROVIDER_NAMES: Partial<Record<SwapProvider, string>> = {
	[SwapProvider.VELORA]: 'Velora',
	[SwapProvider.NEAR_INTENTS]: 'NEAR Intents',
	[SwapProvider.ONE_SEC]: '1Sec'
};

const veloraOrdersUrl = (address: string): string =>
	`${VELORA_EXPLORER_URL}/explorer/user/${address}/all-orders`;

const nearIntentsSearchUrl = (address: string): string =>
	`${NEAR_INTENTS_EXPLORER_URL}/?search=${address}`;

const oneSecAddressUrl = (address: string): string =>
	`${ONESEC_EXPLORER_URL}/explorer/?address=${address}`;

// A link is only worth rendering once its address is known. Addresses load
// asynchronously after sign-in, and an explorer opened with an empty query looks
// broken to the user - so the link is dropped rather than disabled or stubbed.
const toLink = ({
	chain,
	address,
	buildUrl
}: {
	chain: HelpExplorerLink['chain'];
	address: Nullish<string>;
	buildUrl: (address: string) => string;
}): HelpExplorerLink[] => (notEmptyString(address) ? [{ chain, url: buildUrl(address) }] : []);

/**
 * Builds the provider explorer deep links shown on the Help page, each scoped to the
 * address that provider settles against on the given chain.
 *
 * Deliberately not gated behind `NEAR_INTENTS_SWAP_ENABLED` / `ONESEC_SWAP_ENABLED`:
 * those flags decide whether a *new* transfer may be started, while this card answers
 * a question about a transfer already made - which outlives a flag rollback. Same
 * reasoning as the unconditional `swapProvidersDetails` entry for OISY Trade.
 *
 * Groups without a single available link are omitted, so the caller can hide the whole
 * card on an empty result.
 */
export const buildHelpExplorerGroups = ({
	ethAddress,
	solAddress,
	btcAddress,
	principal
}: HelpExplorerAddresses): HelpExplorerGroup[] =>
	[
		{
			provider: SwapProvider.VELORA,
			links: toLink({ chain: 'eth', address: ethAddress, buildUrl: veloraOrdersUrl })
		},
		{
			provider: SwapProvider.NEAR_INTENTS,
			links: [
				...toLink({ chain: 'eth', address: ethAddress, buildUrl: nearIntentsSearchUrl }),
				...toLink({ chain: 'sol', address: solAddress, buildUrl: nearIntentsSearchUrl }),
				...toLink({ chain: 'btc', address: btcAddress, buildUrl: nearIntentsSearchUrl })
			]
		},
		{
			provider: SwapProvider.ONE_SEC,
			links: [
				...toLink({ chain: 'icp', address: principal, buildUrl: oneSecAddressUrl }),
				...toLink({ chain: 'eth', address: ethAddress, buildUrl: oneSecAddressUrl })
			]
		}
	].filter(({ links }) => links.length > 0);
