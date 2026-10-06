<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_XRP, TOKEN_MENU_XRP_EXPLORER_LINK } from '$lib/constants/test-ids.constants';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNetworkXrp } from '$lib/utils/network.utils';

	// XRPScan explorer URLs are built directly: its base URL carries no `$args` placeholder.
	let explorerUrl = $derived(
		isNetworkXrp($pageToken?.network) ? $pageToken.network.explorerUrl : undefined
	);

	let explorerAddressUrl = $derived(
		nonNullish(explorerUrl) && nonNullish($xrpAddressMainnet)
			? `${explorerUrl}/account/${$xrpAddressMainnet}`
			: undefined
	);
</script>

<TokenMenu testId={TOKEN_MENU_XRP}>
	{#if nonNullish(explorerAddressUrl)}
		<div in:fade>
			<ExternalLink
				ariaLabel={$i18n.navigation.text.view_on_explorer}
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={explorerAddressUrl}
				iconVisible={false}
				testId={TOKEN_MENU_XRP_EXPLORER_LINK}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
