<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isTokenIcrc, isTokenDip20 } from '$icp/utils/icrc.utils';
	import List from '$lib/components/common/List.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
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
			<ModalHero>
				{#snippet logo()}
					<TokenLogo logoSize="lg" data={token} badge={{ type: 'network' }} />
				{/snippet}

				{#snippet title()}
					{getTokenDisplaySymbol(token)}
				{/snippet}
			</ModalHero>

			<List styleClass="text-sm" condensed={false}>
				<ModalListItem>
					{#snippet label()}
						{$i18n.tokens.details.network}
					{/snippet}

					{#snippet content()}
						<output>{token.network.name}</output>
						<NetworkLogo network={token.network} />
					{/snippet}
				</ModalListItem>

				<ModalListItem>
					{#snippet label()}
						{$i18n.tokens.details.token}
					{/snippet}

					{#snippet content()}
						<output>{token.name}</output>
						<Logo
							src={token.icon}
							alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
							color="white"
						/>
					{/snippet}
				</ModalListItem>

				{@render children?.()}

				{#if isTokenIcrc(token) || isTokenErc20(token) || isTokenDip20(token)}
					<ModalListItem>
						{#snippet label()}
							{$i18n.tokens.details.standard}
						{/snippet}

						{#snippet content()}
							{token.standard}
						{/snippet}
					</ModalListItem>
				{/if}

				<ModalListItem>
					{#snippet label()}
						{$i18n.core.text.symbol}
					{/snippet}

					{#snippet content()}
						{`${getTokenDisplaySymbol(token)}${nonNullish(token.oisySymbol) ? ` (${token.symbol})` : ''}`}
					{/snippet}
				</ModalListItem>

				<ModalListItem>
					{#snippet label()}
						{$i18n.core.text.decimals}
					{/snippet}

					{#snippet content()}
						{token.decimals}
					{/snippet}
				</ModalListItem>
			</List>
		{/if}

		{#snippet toolbar()}
			<ButtonDone onclick={modalStore.close} />
		{/snippet}
	</ContentWithToolbar>
</Modal>
