<script lang="ts">
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import { token, tokenStandard } from '$lib/derived/token.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import { nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Value from '$lib/components/ui/Value.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';

	let contractAddress: string | undefined;
	$: contractAddress = $tokenStandard === 'erc20' ? ($token as Erc20Token).address : undefined;
</script>

<TokenModal>
	{#if nonNullish(contractAddress)}
		<Value ref="contractAddress">
			<svelte:fragment slot="label">{$i18n.tokens.text.contract_address}</svelte:fragment>
			<output>{contractAddress}</output><Copy
				value={contractAddress}
				text={$i18n.tokens.details.contract_address_copied}
				inline
			/><ExternalLink
				iconSize="18"
				href={`${$explorerUrlStore}/address/${contractAddress}`}
				ariaLabel={$i18n.tokens.alt.open_contract_address_block_explorer}
				inline
				color="blue"
			/>
		</Value>
	{/if}
</TokenModal>
