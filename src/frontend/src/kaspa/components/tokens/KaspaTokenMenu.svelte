<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import type { KaspaAddress } from '$kaspa/types/address';
	import type { KaspaNetwork } from '$kaspa/types/network';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_KASPA } from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import {
		kaspaAddressMainnetStore,
		kaspaAddressTestnetStore
	} from '$lib/stores/address.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { mapAddress } from '$lib/utils/address.utils';
	import { isNetworkIdKASMainnet } from '$lib/utils/network.utils';

	let kaspaAddress = $derived(
		isNetworkIdKASMainnet($networkId)
			? mapAddress<KaspaAddress>($kaspaAddressMainnetStore)
			: mapAddress<KaspaAddress>($kaspaAddressTestnetStore)
	);

	let explorerUrl = $derived(($pageToken?.network as KaspaNetwork).explorerUrl ?? undefined);

	let explorerAddressUrl = $derived(
		nonNullish(explorerUrl) && nonNullish(kaspaAddress)
			? `${explorerUrl}/addresses/${kaspaAddress}`
			: undefined
	);
</script>

<TokenMenu testId={TOKEN_MENU_KASPA}>
	{#if nonNullish(explorerAddressUrl)}
		<div in:fade>
			<ExternalLink
				ariaLabel={$i18n.tokens.alt.open_blockstream}
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={explorerAddressUrl}
				iconVisible={false}
				testId="kaspa-explorer-link"
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
