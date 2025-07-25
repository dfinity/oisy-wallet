<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import type { BitcoinNetwork } from '$btc/types/network';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_BTC } from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import {
		btcAddressMainnetStore,
		btcAddressRegtestStore,
		btcAddressTestnetStore
	} from '$lib/stores/address.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { BtcAddress } from '$lib/types/address';
	import type { Option } from '$lib/types/utils';
	import { mapAddress } from '$lib/utils/address.utils';
	import { isNetworkIdBTCMainnet, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';
	import {pageToken} from "$lib/derived/page-token.derived";


	let btcAddress: Option<string>;
	$: btcAddress = isNetworkIdBTCMainnet($networkId)
		? mapAddress<BtcAddress>($btcAddressMainnetStore)
		: isNetworkIdBTCTestnet($networkId)
			? mapAddress<BtcAddress>($btcAddressTestnetStore)
			: mapAddress<BtcAddress>($btcAddressRegtestStore);

	let explorerUrl: string | undefined;
	$: explorerUrl = ($pageToken?.network as BitcoinNetwork).explorerUrl ?? undefined;

	let explorerAddressUrl: string | undefined;
	$: explorerAddressUrl =
		nonNullish(explorerUrl) && nonNullish(btcAddress)
			? `${explorerUrl}/address/${btcAddress}`
			: undefined;
</script>

<TokenMenu testId={TOKEN_MENU_BTC}>
	{#if nonNullish(explorerAddressUrl)}
		<div in:fade>
			<ExternalLink
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={explorerAddressUrl}
				ariaLabel={$i18n.tokens.alt.open_blockstream}
				iconVisible={false}
				testId="btc-explorer-link"
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
