<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';

	let explorerUrl: string | undefined;
	$: explorerUrl = ($token as OptionIcCkToken)?.explorerUrl;

	let transactionsExplorerUrl: string | undefined;
	$: transactionsExplorerUrl = nonNullish(explorerUrl) ? `${explorerUrl}/transactions` : undefined;
</script>

<TokenMenu>
	{#if nonNullish(transactionsExplorerUrl)}
		<div in:fade>
			<ExternalLink
				fullWidth
				href={transactionsExplorerUrl}
				ariaLabel={$i18n.tokens.alt.open_dashboard}
				iconVisible={false}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
