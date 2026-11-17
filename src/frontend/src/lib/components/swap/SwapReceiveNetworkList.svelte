<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onMount, tick } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { SWAP_RECEIVE_NETWORK_LIST } from '$lib/constants/test-ids.constants';
	import { crossChainSwapNetworksMainnets } from '$lib/derived/cross-chain-networks.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { allSwapUniverseTokens } from '$lib/derived/swap.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { trackSwapReceiveShortcut } from '$lib/services/swap-receive-shortcut-analytics.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getListedReceiveShortcuts } from '$lib/utils/swap.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		onSelectToken: (token: Token) => void;
		onClose: () => void;
	}

	let { onSelectToken, onClose }: Props = $props();

	const { sourceToken, receiveSupportedData } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let root: HTMLDivElement;

	onMount(() => {
		root.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true });
	});

	const returnToForm = async (token?: Token) => {
		// The dialog survives step changes, including Get Token rebuilding the swap wizard.
		const dialog = root.closest('[role="dialog"]');

		if (nonNullish(token)) {
			onSelectToken(token);
		} else {
			onClose();
		}

		await tick();

		if (dialog?.isConnected) {
			dialog
				.querySelector<HTMLElement>('[data-swap-receive-area] button:not([disabled])')
				?.focus({ preventScroll: true });
		}
	};

	// The networks of "<symbol> on another network", read as the shortcut reads them.
	let otherNetwork = $derived(
		isNullish($sourceToken)
			? undefined
			: getListedReceiveShortcuts({
					sourceToken: $sourceToken,
					supportedData: $receiveSupportedData,
					swapNetworks: $crossChainSwapNetworksMainnets,
					chainNetworks: $networks,
					tokens: $allSwapUniverseTokens,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges,
					$tokensToPin
				})?.shortcuts.otherNetwork
	);

	const select = (token: Token) => {
		if (nonNullish($sourceToken)) {
			trackSwapReceiveShortcut({
				action: 'other_network',
				sourceToken: $sourceToken,
				destinationToken: token
			});
		}

		void returnToForm(token);
	};
</script>

<div bind:this={root}>
	<div
		class="mb-4 flex flex-col overflow-y-auto overscroll-contain sm:max-h-[26rem]"
		data-tid={SWAP_RECEIVE_NETWORK_LIST}
	>
		{#if nonNullish(otherNetwork)}
			{@const { group, tokens } = otherNetwork}
			<List noPadding>
				{#each tokens as token (token.id)}
					{@const symbol = getTokenDisplaySymbol(token)}
					<ListItem styleClass="first-of-type:border-t-1">
						<ModalTokensListItem onClick={() => select(token)} {token}>
							{#snippet label()}{token.network.name}{/snippet}

							{#snippet detail()}
								{symbol === group.symbol
									? symbol
									: replacePlaceholders($i18n.swap.text.as_token, { $symbol: symbol })}
							{/snippet}
						</ModalTokensListItem>
					</ListItem>
				{/each}
			</List>
		{/if}
	</div>

	<ButtonGroup>
		<ButtonBack fullWidth onclick={() => returnToForm()} />
	</ButtonGroup>
</div>
