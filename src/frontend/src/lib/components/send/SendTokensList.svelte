<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		onSendToken: (token: Token) => void;
		onSelectNetworkFilter: () => void;
	}

	let { onSendToken, onSelectNetworkFilter }: Props = $props();

	const onTokenButtonClick = (token: Token) => {
		onSendToken(token);
	};
</script>

<ModalTokensList
	networkSelectorViewOnly={nonNullish($selectedNetwork)}
	{onSelectNetworkFilter}
	{onTokenButtonClick}
>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}
	{#snippet noResults()}
		<p class="text-primary">
			{$i18n.tokens.manage.text.all_tokens_zero_balance}
		</p>
	{/snippet}
	{#snippet toolbar()}
		<ButtonCloseModal />
	{/snippet}
</ModalTokensList>
