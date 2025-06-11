<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isTokenIcrc, isTokenDip20 } from '$icp/utils/icrc.utils';
	import List from '$lib/components/common/List.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { TOKEN_MODAL_CONTENT_DELETE_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface BaseTokenModalProps {
		children?: Snippet;
		token: OptionToken;
		onDeleteClick?: () => void;
	}

	let { children, token, onDeleteClick }: BaseTokenModalProps = $props();
</script>

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

		{#if nonNullish(onDeleteClick)}
			<div class="mt-4">
				<Button
					ariaLabel={$i18n.tokens.text.delete_token}
					transparent
					styleClass="mx-auto"
					colorStyle="error"
					onclick={onDeleteClick}
					testId={TOKEN_MODAL_CONTENT_DELETE_BUTTON}
				>
					<IconTrash />
					{$i18n.tokens.text.delete_token}
				</Button>
			</div>
		{/if}
	{/if}

	{#snippet toolbar()}
		<ButtonDone onclick={modalStore.close} />
	{/snippet}
</ContentWithToolbar>
