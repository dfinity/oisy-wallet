<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { erc20CustomTokensInitialized } from '$eth/derived/erc20.derived';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_ETH } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let explorerUrl = $derived(
		nonNullish($pageToken)
			? isTokenErc20($pageToken)
				? `${getExplorerUrl({ token: $pageToken })}/token/${$pageToken.address}`
				: notEmptyString($ethAddress)
					? `${getExplorerUrl({ token: $pageToken })}/address/${$ethAddress}`
					: undefined
			: undefined
	);
</script>

<TokenMenu testId={TOKEN_MENU_ETH}>
	{#if nonNullish(explorerUrl) && $erc20CustomTokensInitialized}
		<div in:fade>
			<ExternalLink
				ariaLabel={$i18n.tokens.alt.open_etherscan}
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={explorerUrl}
				iconVisible={false}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
