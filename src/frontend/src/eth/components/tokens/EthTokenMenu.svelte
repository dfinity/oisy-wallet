<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { erc20UserTokensInitialized } from '$eth/derived/erc20.derived';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_ETH } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';

	let explorerUrl: string | undefined;
	$: explorerUrl =
		$tokenStandard === 'erc20' && nonNullish($token)
			? `${$explorerUrlStore}/token/${($token as Erc20Token).address}`
			: notEmptyString($ethAddress)
				? `${$explorerUrlStore}/address/${$ethAddress}`
				: undefined;
</script>

<TokenMenu testId={TOKEN_MENU_ETH}>
	{#if nonNullish(explorerUrl) && $erc20UserTokensInitialized}
		<div in:fade>
			<ExternalLink
				asMenuItem
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
