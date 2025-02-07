<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import {
		SOLANA_DEVNET_NETWORK,
		SOLANA_LOCAL_NETWORK,
		SOLANA_MAINNET_NETWORK,
		SOLANA_TESTNET_NETWORK
	} from '$env/networks/networks.sol.env';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionSolAddress } from '$lib/types/address';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import type { SolanaNetwork } from '$sol/types/network';

	let address: OptionSolAddress;
	let network: SolanaNetwork;
	$: [address, network] = isNetworkIdSOLTestnet($networkId)
		? [$solAddressTestnet, SOLANA_TESTNET_NETWORK]
		: isNetworkIdSOLDevnet($networkId)
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

<div>
	<label class="block text-sm font-bold" for="eth-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output class="break-all" id="eth-wallet-address"
		>{shortenWithMiddleEllipsis({ text: address ?? '' })}</output
	><Copy inline color="inherit" value={address ?? ''} text={$i18n.wallet.text.address_copied} />
</div>

{#if nonNullish(explorerAddressUrl)}
	<ExternalLink href={explorerAddressUrl} ariaLabel={$i18n.wallet.alt.open_solscan}>
		{$i18n.navigation.text.view_on_explorer}
	</ExternalLink>
{/if}
