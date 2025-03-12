<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import Token from '$lib/components/tokens/Token.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkSolana } from '$lib/utils/network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	let explorerUrl: string | undefined;
	$: explorerUrl = isNetworkSolana($token?.network) ? $token.network.explorerUrl : undefined;

	let tokenAddress: string | undefined;
	$: tokenAddress = nonNullish($token) && isTokenSpl($token) ? $token.address : undefined;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<ContentWithToolbar>
		{#if nonNullish($token)}
			<Token token={$token}>
				{#if nonNullish(tokenAddress)}
					<Value ref="contractAddress">
						<svelte:fragment slot="label">{$i18n.tokens.text.token_address}</svelte:fragment>
						<output>{tokenAddress}</output><Copy
							value={tokenAddress}
							text={$i18n.tokens.details.token_address_copied}
							inline
						/><ExternalLink
							iconSize="18"
							href={nonNullish(explorerUrl)
								? replacePlaceholders(explorerUrl, { $args: `token/${tokenAddress}/` })
								: ''}
							ariaLabel={$i18n.tokens.alt.open_token_address_block_explorer}
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
