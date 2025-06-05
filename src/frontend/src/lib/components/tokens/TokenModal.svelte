<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isTokenIcrc, isTokenDip20 } from '$icp/utils/icrc.utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface BaseTokenModalProps {
		children?: Snippet;
		token: OptionToken;
	}

	let { children, token }: BaseTokenModalProps = $props();
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<ContentWithToolbar>
		{#if nonNullish(token)}
			<ModalValue ref="network">
				{#snippet label()}
					{$i18n.tokens.details.network}
				{/snippet}

				{#snippet mainValue()}
					<output>{token.network.name}</output>
				{/snippet}

				{#snippet secondaryValue()}
					<NetworkLogo network={token.network} />
				{/snippet}
			</ModalValue>

			<ModalValue ref="name">
				{#snippet label()}
					{$i18n.tokens.details.token}
				{/snippet}

				{#snippet mainValue()}
					<output>{token.name}</output>
				{/snippet}

				{#snippet secondaryValue()}
					<Logo
						src={token.icon}
						alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
						color="white"
					/>
				{/snippet}
			</ModalValue>

			{@render children?.()}

			{#if isTokenIcrc(token) || isTokenErc20(token) || isTokenDip20(token)}
				<ModalValue ref="symbol">
					{#snippet label()}
						{$i18n.tokens.details.standard}
					{/snippet}

					{#snippet mainValue()}
						<output>{token.standard}</output>
					{/snippet}
				</ModalValue>
			{/if}

			<ModalValue ref="symbol">
				{#snippet label()}
					{$i18n.core.text.symbol}
				{/snippet}

				{#snippet mainValue()}
					<output>
						{`${getTokenDisplaySymbol(token)}${nonNullish(token.oisySymbol) ? ` (${token.symbol})` : ''}`}
					</output>
				{/snippet}
			</ModalValue>

			<ModalValue ref="decimals">
				{#snippet label()}
					{$i18n.core.text.decimals}
				{/snippet}

				{#snippet mainValue()}
					<output>{token.decimals}</output>
				{/snippet}
			</ModalValue>
		{/if}

		<ButtonDone onclick={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>
