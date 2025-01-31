<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { explorerUrl as explorerUrlStore } from '$eth/derived/network.derived';
	import type { OptionErc20Token } from '$eth/types/erc20';
	import Token from '$lib/components/tokens/Token.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';

	let contractAddress: string | undefined;
	$: contractAddress =
		$tokenStandard === 'erc20' ? ($token as OptionErc20Token)?.address : undefined;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<ContentWithToolbar>
		{#if nonNullish($token)}
			<Token token={$token}>
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
			</Token>
		{/if}

		<ButtonDone on:click={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
