<script lang="ts">
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		onSelect: (token: Token) => void;
		onSelectNetworkFilter: () => void;
		onBack: () => void;
	}

	let { onSelect, onSelectNetworkFilter, onBack }: Props = $props();
</script>

<ModalTokensList {onSelectNetworkFilter} onTokenButtonClick={onSelect}>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}
	{#snippet noResults()}
		<p class="text-primary">
			{$i18n.tokens.manage.text.all_tokens_zero_balance}
		</p>
	{/snippet}
	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />
		</ButtonGroup>
	{/snippet}
</ModalTokensList>
