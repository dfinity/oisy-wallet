<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	let contractAddress: string | undefined;
	$: contractAddress =
		$pageToken?.standard === 'erc20' ? ($pageToken as OptionErc20Token)?.address : undefined;
</script>

<TokenModal token={$pageToken}>
	{#if nonNullish(contractAddress)}
		<ModalListItem>
			{#snippet label()}
				{$i18n.tokens.text.contract_address}
			{/snippet}

			{#snippet content()}
				<output>{shortenWithMiddleEllipsis({ text: contractAddress })}</output>

				<Copy value={contractAddress} text={$i18n.tokens.details.contract_address_copied} inline />

				<ExternalLink
					iconSize="18"
					href={`${$explorerUrlStore}/address/${contractAddress}`}
					ariaLabel={$i18n.tokens.alt.open_contract_address_block_explorer}
					inline
					color="blue"
				/>
			{/snippet}
		</ModalListItem>
	{/if}
</TokenModal>
