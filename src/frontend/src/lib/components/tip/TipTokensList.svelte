<script lang="ts">
	import { getContext } from 'svelte';
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
		onSelectToken: (token: Token) => void;
		onClose: () => void;
	}

	let { onSelectToken, onClose }: Props = $props();

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let tokens = $derived(tippableTokens($enabledFungibleTokens));

	$effect(() => {
		setTokens(tokens);
	});
</script>

<ModalTokensList networkSelectorViewOnly onTokenButtonClick={onSelectToken}>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}

	{#snippet noResults()}
		<div class="py-12">
			<p class="m-0 text-center text-lg font-bold">
				{tokens.length === 0
					? $i18n.tip.text.no_supported_tokens_title
					: $i18n.tokens.text.all_tokens_with_zero_hidden}
			</p>
			<p class="m-0 mt-4 text-center text-tertiary">
				{tokens.length === 0
					? $i18n.tip.text.no_supported_tokens_description
					: $i18n.tip.text.empty_balance_description}
			</p>
		</div>
	{/snippet}

	{#snippet toolbar()}
		<ButtonCancel fullWidth onclick={onClose} />
	{/snippet}
</ModalTokensList>
