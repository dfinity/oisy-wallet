<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { liquidiumBorrowMarkets } from '$lib/derived/liquidium.derived';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { Token } from '$lib/types/token';

	interface Props {
		// Omitted on a neutral (token-less) launch — then nothing is excluded.
		selectedMarket?: LiquidiumMarket;
		onSelectMarket: (market: LiquidiumMarket) => void;
		onClose: () => void;
	}

	let { selectedMarket, onSelectMarket, onClose }: Props = $props();

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let entries = $derived(
		$liquidiumBorrowMarkets
			.map((market) => ({ market, token: LIQUIDIUM_ASSET_TOKENS[market.asset] }))
			.filter(
				(entry): entry is { market: LiquidiumMarket; token: Token } =>
					nonNullish(entry.token) && entry.market.poolId !== selectedMarket?.poolId
			)
	);

	$effect(() => {
		setTokens(entries.map(({ token }) => token));
	});

	const onTokenButtonClick = (token: Token) => {
		const entry = entries.find(({ token: { id } }) => id === token.id);

		if (nonNullish(entry)) {
			onSelectMarket(entry.market);
		}
	};
</script>

<ModalTokensList networkSelectorViewOnly {onTokenButtonClick}>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}
	{#snippet toolbar()}
		<ButtonCancel fullWidth onclick={onClose} />
	{/snippet}
</ModalTokensList>
