<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { erc20DefaultTokens } from '$eth/derived/erc20.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import { isTokenErc20 } from '$eth/utils/erc20.utils.js';
	import { getExplorerUrl } from '$eth/utils/eth.utils';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		fromRoute?: NavigationTarget;
	}

	let { fromRoute }: Props = $props();

	let isErc20 = $derived(nonNullish($pageToken) && isTokenErc20($pageToken));

	let contractAddress = $derived(isErc20 ? ($pageToken as Erc20Token).address : undefined);

	let undeletableToken = $derived(
		nonNullish($pageToken) && isErc20
			? $erc20DefaultTokens.some(
					({ id, network: { id: networkId } }) =>
						$pageToken.id === id && $pageToken.network.id === networkId
				)
			: true
	);
</script>

<TokenModal {fromRoute} isDeletable={!undeletableToken} token={$pageToken}>
	{#if nonNullish(contractAddress)}
		<ModalListItem>
			{#snippet label()}
				{$i18n.tokens.text.contract_address}
			{/snippet}

			{#snippet content()}
				<output>{shortenWithMiddleEllipsis({ text: contractAddress })}</output>

				<Copy inline text={$i18n.tokens.details.contract_address_copied} value={contractAddress} />

				<ExternalLink
					ariaLabel={$i18n.tokens.alt.open_contract_address_block_explorer}
					color="blue"
					href={`${getExplorerUrl({ token: $pageToken })}/address/${contractAddress}`}
					iconSize="18"
					inline
				/>
			{/snippet}
		</ModalListItem>
	{/if}
</TokenModal>
