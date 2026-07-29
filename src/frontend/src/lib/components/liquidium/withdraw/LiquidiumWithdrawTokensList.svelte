<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { liquidiumWithdrawReserves } from '$lib/derived/liquidium.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { Token } from '$lib/types/token';
	import { liquidiumMarketToken } from '$lib/utils/liquidium.utils';

	interface Props {
		// Omitted on a neutral (token-less) launch — then nothing is excluded.
		selectedReserve?: LiquidiumReserve;
		onSelectReserve: (reserve: LiquidiumReserve) => void;
		onClose: () => void;
	}

	let { selectedReserve, onSelectReserve, onClose }: Props = $props();

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let entries = $derived(
		$liquidiumWithdrawReserves
			.map((reserve) => ({
				reserve,
				token: liquidiumMarketToken({ chain: reserve.chain, asset: reserve.asset, tokens: $tokens })
			}))
			.filter(
				// Exclude only the currently-selected rail, keyed by (poolId, chain): a pool now
				// yields one entry per rail, so keying on poolId alone would hide the other rail too.
				(entry): entry is { reserve: LiquidiumReserve; token: Token } =>
					nonNullish(entry.token) &&
					!(
						entry.reserve.poolId === selectedReserve?.poolId &&
						entry.reserve.chain === selectedReserve?.chain
					)
			)
	);

	$effect(() => {
		setTokens(entries.map(({ token }) => token));
	});

	const onTokenButtonClick = (token: Token) => {
		const entry = entries.find(({ token: { id } }) => id === token.id);

		if (nonNullish(entry)) {
			onSelectReserve(entry.reserve);
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
