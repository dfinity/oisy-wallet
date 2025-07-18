<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_ETH } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let explorerUrl: string | undefined;
	$: explorerUrl = nonNullish($pageToken)
		? $tokenStandard === 'erc20'
			? `${getExplorerUrl({ token: $pageToken })}/token/${($pageToken as Erc20Token).address}`
			: notEmptyString($ethAddress)
				? `${getExplorerUrl({ token: $pageToken })}/address/${$ethAddress}`
				: undefined
		: undefined;
</script>

<TokenMenu testId={TOKEN_MENU_ETH}>
	{#if nonNullish(explorerUrl) && $erc20UserTokensInitialized}
		<div in:fade>
			<ExternalLink
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={explorerUrl}
				ariaLabel={$i18n.tokens.alt.open_etherscan}
				iconVisible={false}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
