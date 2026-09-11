import {
	ARBITRUM_EXPLORER_URL,
	BASE_EXPLORER_URL,
	BSC_EXPLORER_URL,
	BTC_MAINNET_ADDRESS_EXPLORER_URL,
	ETHEREUM_EXPLORER_URL,
	ICP_ADDRESS_EXPLORER_URL,
	NEAR_INTENTS_EXPLORER_URL,
	ONESEC_EXPLORER_URL,
	POLYGON_EXPLORER_URL,
	SOL_MAINNET_EXPLORER_URL,
	VELORA_EXPLORER_URL
} from '$env/explorers.env';
import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import type {
	HelpExplorerAddresses,
	HelpExplorerChain,
	HelpExplorerGroup,
	HelpExplorerLink,
	HelpNetworkExplorerLink
} from '$lib/types/help';
import type { Network, NetworkId } from '$lib/types/network';
import { SwapProvider } from '$lib/types/swap';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish, notEmptyString } from '@dfinity/utils';
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

// Where a whole address is looked up on each mainnet network, and which of the wallet's
// addresses to look up there. Six entries reuse the network's own explorer host, so the
// Help page and a transaction link land on the same site; ICP and BTC use the dedicated
// address explorers (see `ADDRESS_EXPLORER_URLS`).
//
// Keyed by network id rather than derived from `network.explorerUrl`, because the path to
// an address is not uniform: Solana's URL is a template with the path in the middle, and
// the ICP dashboard has no page for a principal at all. A mainnet network missing here
// simply gets no link, which is why the whole thing is `Partial`.
const NETWORK_ADDRESS_EXPLORERS: Partial<
	Record<NetworkId, { chain: HelpExplorerChain; buildUrl: (address: string) => string }>
> = {
	[ICP_NETWORK_ID]: {
		chain: 'icp',
		buildUrl: (address) => `${ICP_ADDRESS_EXPLORER_URL}/address/details/${address}`
	},
	[BTC_MAINNET_NETWORK_ID]: {
		chain: 'btc',
		buildUrl: (address) => `${BTC_MAINNET_ADDRESS_EXPLORER_URL}/address/${address}`
	},
	[ETHEREUM_NETWORK_ID]: {
		chain: 'eth',
		buildUrl: (address) => `${ETHEREUM_EXPLORER_URL}/address/${address}`
	},
	[ARBITRUM_MAINNET_NETWORK_ID]: {
		chain: 'arb',
		buildUrl: (address) => `${ARBITRUM_EXPLORER_URL}/address/${address}`
	},
	[BASE_NETWORK_ID]: {
		chain: 'base',
		buildUrl: (address) => `${BASE_EXPLORER_URL}/address/${address}`
	},
	[BSC_MAINNET_NETWORK_ID]: {
		chain: 'bsc',
		buildUrl: (address) => `${BSC_EXPLORER_URL}/address/${address}`
	},
	[POLYGON_MAINNET_NETWORK_ID]: {
		chain: 'pol',
		buildUrl: (address) => `${POLYGON_EXPLORER_URL}/address/${address}`
	},
	[SOLANA_MAINNET_NETWORK_ID]: {
		chain: 'sol',
		// Solscan's URL is a template, not a base - the cluster follows the path on
		// non-mainnet clusters - so the account path is substituted, as elsewhere in the app.
		buildUrl: (address) =>
			replacePlaceholders(SOL_MAINNET_EXPLORER_URL, { $args: `account/${address}` })
	}
};

const addressForChain = ({
	chain,
	ethAddress,
	solAddress,
	btcAddress,
	principal
}: HelpExplorerAddresses & { chain: HelpExplorerChain }): Nullish<string> => {
	if (chain === 'icp') {
		return principal;
	}

	if (chain === 'btc') {
		return btcAddress;
	}

	if (chain === 'sol') {
		return solAddress;
	}

	// Every remaining chain is EVM, where one Ethereum address is read on all of them.
	return ethAddress;
};

/**
 * Builds one block explorer link per given network, each opening that chain's explorer at
 * the user's own address for it.
 *
 * Callers pass the networks the user actually has enabled, so disabling one removes its
 * link without a second list to keep in sync. Networks with no address yet, and networks
 * with no address explorer, are omitted - leaving an empty array the caller can use to
 * hide the card.
 */
export const buildHelpNetworkExplorerLinks = ({
	networks,
	...addresses
}: HelpExplorerAddresses & { networks: Network[] }): HelpNetworkExplorerLink[] =>
	networks.reduce<HelpNetworkExplorerLink[]>((links, network) => {
		const explorer = NETWORK_ADDRESS_EXPLORERS[network.id];

		if (isNullish(explorer)) {
			return links;
		}

		const { chain, buildUrl } = explorer;
		const address = addressForChain({ chain, ...addresses });

		return notEmptyString(address) ? [...links, { network, chain, url: buildUrl(address) }] : links;
	}, []);
