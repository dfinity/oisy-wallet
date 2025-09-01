<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_SOL, TOKEN_MENU_SOL_EXPLORER_LINK } from '$lib/constants/test-ids.constants';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import type { SolanaNetwork } from '$sol/types/network';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	let explorerUrl = $derived(($pageToken?.network as SolanaNetwork)?.explorerUrl);

	let address = $derived(
		isNetworkIdSOLDevnet($networkId)
			? $solAddressDevnet
			: isNetworkIdSOLLocal($networkId)
				? $solAddressLocal
				: $solAddressMainnet
	);

	let tokenAddress = $derived(
		nonNullish($pageToken) && isTokenSpl($pageToken) ? $pageToken.address : undefined
	);

	let explorerAddressUrl = $derived(
		nonNullish(explorerUrl)
			? replacePlaceholders(explorerUrl, {
					$args: nonNullish(tokenAddress) ? `token/${tokenAddress}/` : `account/${address}/`
				})
			: undefined
	);
</script>

<TokenMenu testId={TOKEN_MENU_SOL}>
	{#if nonNullish(explorerAddressUrl)}
		<div in:fade>
			<ExternalLink
				ariaLabel={$i18n.tokens.alt.open_dashboard}
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={explorerAddressUrl}
				iconVisible={false}
				testId={TOKEN_MENU_SOL_EXPLORER_LINK}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
