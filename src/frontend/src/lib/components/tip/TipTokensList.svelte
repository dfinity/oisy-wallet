<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { enabledFungibleTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Token } from '$lib/types/token';
	import { tippableTokens } from '$lib/utils/tip.utils';

	interface Props {
		onSelectToken: (token: IcToken) => void;
		onClose: () => void;
	}

	let { onSelectToken, onClose }: Props = $props();

	const { setTokens, filterQuery } = getContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY
	);

	let tokens = $derived(tippableTokens($enabledFungibleTokens));

	$effect(() => {
		setTokens(tokens);
	});

	// The list is built from `tokens`, so the clicked token is always one of them —
	// recovering it by id hands the caller the IC type the approve needs, without
	// casting away the list component's generic `Token`.
	const onTokenButtonClick = (token: Token) => {
		const selected = tokens.find(({ id }) => id === token.id);

		if (nonNullish(selected)) {
			onSelectToken(selected);
		}
	};
</script>

<ModalTokensList networkSelectorViewOnly {onTokenButtonClick}>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}

	{#snippet noResults()}
		<!--
			Three different reasons the list can be empty, and they are not
			interchangeable. `ModalTokensList` renders this once its own search and
			category filters match nothing, while `tokens` is the *unfiltered*
			tippable set — so testing only `tokens.length` told a user whose search
			simply missed that their assets were hidden for having no balance.
		-->
		{@const searching = ($filterQuery ?? '') !== ''}
		<div class="py-12">
			<p class="m-0 text-center text-lg font-bold">
				{#if tokens.length === 0}
					{$i18n.tip.text.no_supported_tokens_title}
				{:else if searching}
					{$i18n.core.text.no_results}
				{:else}
					{$i18n.tokens.text.all_tokens_with_zero_hidden}
				{/if}
			</p>
			{#if !searching}
				<p class="m-0 mt-4 text-center text-tertiary">
					{tokens.length === 0
						? $i18n.tip.text.no_supported_tokens_description
						: $i18n.tip.text.empty_balance_description}
				</p>
			{/if}
		</div>
	{/snippet}

	{#snippet toolbar()}
		<ButtonCancel fullWidth onclick={onClose} />
	{/snippet}
</ModalTokensList>
