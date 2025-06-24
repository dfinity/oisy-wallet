<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkSolana } from '$lib/utils/network.utils';
	import { splDefaultTokens } from '$sol/derived/spl.derived';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		fromRoute: NavigationTarget | undefined;
	}
	let { fromRoute }: Props = $props();

	let explorerUrl = $derived(
		isNetworkSolana($pageToken?.network) ? $pageToken.network.explorerUrl : undefined
	);

	let tokenAddress = $derived(
		nonNullish($pageToken) && isTokenSpl($pageToken) ? $pageToken.address : undefined
	);

	let undeletableToken = $derived(
		nonNullish($pageToken) && isTokenSpl($pageToken)
			? $splDefaultTokens.some(({ address }) => $pageToken.address === address)
			: true
	);
</script>

<TokenModal token={$pageToken} isDeletable={!undeletableToken} {fromRoute}>
	{#if nonNullish(tokenAddress)}
		<ModalListItem>
			{#snippet label()}
				{$i18n.tokens.text.token_address}
			{/snippet}

			{#snippet content()}
				<output>{shortenWithMiddleEllipsis({ text: tokenAddress })}</output>

				<Copy value={tokenAddress} text={$i18n.tokens.details.token_address_copied} inline />

				<ExternalLink
					iconSize="18"
					href={nonNullish(explorerUrl)
						? replacePlaceholders(explorerUrl, { $args: `token/${tokenAddress}/` })
						: ''}
					ariaLabel={$i18n.tokens.alt.open_token_address_block_explorer}
					inline
					color="blue"
				/>
			{/snippet}
		</ModalListItem>
	{/if}
</TokenModal>
