<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import {
		SOLANA_DEVNET_NETWORK,
		SOLANA_LOCAL_NETWORK,
		SOLANA_MAINNET_NETWORK
	} from '$env/networks/networks.sol.env';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionSolAddress } from '$lib/types/address';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import type { SolanaNetwork } from '$sol/types/network';

	let address: OptionSolAddress;
	let network: SolanaNetwork;
	$: [address, network] = isNetworkIdSOLDevnet($networkId)
		? [$solAddressDevnet, SOLANA_DEVNET_NETWORK]
		: isNetworkIdSOLLocal($networkId)
			? [$solAddressLocal, SOLANA_LOCAL_NETWORK]
			: [$solAddressMainnet, SOLANA_MAINNET_NETWORK];

	let explorerUrl: string | undefined;
	$: ({ explorerUrl } = network);

	let explorerAddressUrl: string | undefined;
	$: explorerAddressUrl = nonNullish(explorerUrl)
		? replacePlaceholders(explorerUrl, { $args: `account/${address}/` })
		: undefined;
</script>

<div class="p-3">
	<label class="block text-sm font-bold" for="eth-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output class="break-all" id="eth-wallet-address"
		>{shortenWithMiddleEllipsis({ text: address ?? '' })}</output
	><Copy inline value={address ?? ''} text={$i18n.wallet.text.address_copied} />
</div>

{#if nonNullish(explorerAddressUrl)}
	<ExternalLink asMenuItem href={explorerAddressUrl} ariaLabel={$i18n.wallet.alt.open_solscan}>
		{$i18n.navigation.text.view_on_explorer}
	</ExternalLink>
{/if}
