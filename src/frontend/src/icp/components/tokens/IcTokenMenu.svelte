<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import TokenMenu from '$lib/components/tokens/TokenMenu.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TOKEN_MENU_IC } from '$lib/constants/test-ids.constants';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let explorerUrl = $derived(($pageToken as OptionIcCkToken)?.explorerUrl);

	let transactionsExplorerUrl = $derived(
		nonNullish(explorerUrl) ? `${explorerUrl}/transactions` : undefined
	);
</script>

<TokenMenu testId={TOKEN_MENU_IC}>
	{#if nonNullish(transactionsExplorerUrl)}
		<div in:fade>
			<ExternalLink
				ariaLabel={$i18n.tokens.alt.open_dashboard}
				asMenuItem
				asMenuItemCondensed
				fullWidth
				href={transactionsExplorerUrl}
				iconVisible={false}
			>
				{$i18n.navigation.text.view_on_explorer}
			</ExternalLink>
		</div>
	{/if}
</TokenMenu>
