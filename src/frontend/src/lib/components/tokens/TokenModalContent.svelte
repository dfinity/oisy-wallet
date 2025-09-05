<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isTokenIcrc, isTokenDip20 } from '$icp/utils/icrc.utils';
	import List from '$lib/components/common/List.svelte';
	import ModalHero from '$lib/components/common/ModalHero.svelte';
	import ModalListItem from '$lib/components/common/ModalListItem.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import {
		TOKEN_MODAL_CONTENT_DELETE_BUTTON,
		TOKEN_MODAL_INDEX_CANISTER_ID_EDIT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionToken } from '$lib/types/token';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface BaseTokenModalProps {
		children?: Snippet;
		token: OptionToken;
		onDeleteClick?: () => void;
		onEditClick?: () => void;
	}

	let { children, token, onDeleteClick, onEditClick }: BaseTokenModalProps = $props();
</script>

<ContentWithToolbar>
	{#if nonNullish(token)}
		<ModalHero>
			{#snippet logo()}
				<TokenLogo badge={{ type: 'network' }} data={token} logoSize="lg" />
			{/snippet}

			{#snippet title()}
				{getTokenDisplaySymbol(token)}
			{/snippet}
		</ModalHero>

		<List condensed={false} styleClass="text-sm">
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
						alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
						color="white"
						src={token.icon}
					/>
				{/snippet}
			</ModalListItem>

			{@render children?.()}

			{#if isTokenIcrc(token) && (!isNullishOrEmpty(token.indexCanisterId) || nonNullish(onEditClick))}
				<ModalListItem styleClass="flex-wrap">
					{#snippet label()}
						{$i18n.tokens.import.text.index_canister_id}
					{/snippet}

					{#snippet content()}
						{#if !isNullishOrEmpty(token.indexCanisterId)}
							<output>{token.indexCanisterId}</output>
						{:else if nonNullish(onEditClick)}
							<output class="text-warning-primary">
								{$i18n.tokens.details.missing_index_canister_id_label}
							</output>
						{/if}

						{#if !isNullishOrEmpty(token.indexCanisterId)}
							<Copy
								inline
								text={$i18n.tokens.import.text.index_canister_id_copied}
								value={token.indexCanisterId}
							/>
						{/if}

						{#if nonNullish(onEditClick)}
							<ButtonIcon
								ariaLabel={$i18n.core.text.edit}
								height="h-6"
								onclick={onEditClick}
								styleClass="inline-block align-sub"
								testId={TOKEN_MODAL_INDEX_CANISTER_ID_EDIT_BUTTON}
								width="w-6"
							>
								{#snippet icon()}
									<IconPencil />
								{/snippet}
							</ButtonIcon>
						{/if}
					{/snippet}

					{#snippet banner()}
						{#if isNullishOrEmpty(token.indexCanisterId) && nonNullish(onEditClick)}
							<WarningBanner styleClass="font-normal mt-2.5">
								<div class="max-w-[60%]">
									{replaceOisyPlaceholders($i18n.tokens.details.missing_index_canister_id_warning)}
								</div>

								<Button
									ariaLabel={$i18n.tokens.details.missing_index_canister_id_button}
									link
									onclick={onEditClick}
									transparent
									type="button"
								>
									{$i18n.tokens.details.missing_index_canister_id_button}
								</Button>
							</WarningBanner>
						{/if}
					{/snippet}
				</ModalListItem>
			{/if}

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
					colorStyle="error"
					onclick={onDeleteClick}
					styleClass="mx-auto"
					testId={TOKEN_MODAL_CONTENT_DELETE_BUTTON}
					transparent
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
