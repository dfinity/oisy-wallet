<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import type { BitcoinNetwork } from '$btc/types/network';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_BTC } from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import {
		btcAddressMainnetStore,
		btcAddressRegtestStore,
		btcAddressTestnetStore
	} from '$lib/stores/address.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { BtcAddress } from '$lib/types/address';
	import { mapAddress } from '$lib/utils/address.utils';
	import { isNetworkIdBTCMainnet, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';

	let btcAddress = $derived(
		isNetworkIdBTCMainnet($networkId)
			? mapAddress<BtcAddress>($btcAddressMainnetStore)
			: isNetworkIdBTCTestnet($networkId)
				? mapAddress<BtcAddress>($btcAddressTestnetStore)
				: mapAddress<BtcAddress>($btcAddressRegtestStore)
	);

	let explorerUrl = $derived(($pageToken?.network as BitcoinNetwork).explorerUrl ?? undefined);

	let explorerAddressUrl = $derived(
		nonNullish(explorerUrl) && nonNullish(btcAddress)
			? `${explorerUrl}/address/${btcAddress}`
			: undefined
	);
</script>

<TokenMenu testId={TOKEN_MENU_BTC}>
	{#if nonNullish(explorerAddressUrl)}
		<div in:fade>
			<ExternalLink
				ariaLabel={$i18n.tokens.alt.open_blockstream}
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={explorerAddressUrl}
				iconVisible={false}
				testId="btc-explorer-link"
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
