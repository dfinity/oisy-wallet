<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext, onMount, tick } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import {
		SWAP_RECEIVE_NETWORK_LIST,
		SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK
	} from '$lib/constants/test-ids.constants';
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
	import type { Token, TokenId } from '$lib/types/token';
	import type { TokenGroupId } from '$lib/types/token-group';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getListedReceiveShortcuts, getSwapMoveTokenSymbol } from '$lib/utils/swap.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		onSelectToken: (token: Token) => void;
		onClose: () => void;
	}

	let { onSelectToken, onClose }: Props = $props();

	const { sourceToken, destinationToken, receiveSupportedData, tokenListReturnFocus } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let root: HTMLDivElement;
	let list: HTMLDivElement;

	const firstControl = () => root?.querySelector<HTMLButtonElement>('button:not([disabled])');

	onMount(() => firstControl()?.focus({ preventScroll: true }));

	const returnToForm = async (token?: Token) => {
		// The dialog survives step changes, including Get Token rebuilding the swap wizard.
		const dialog = root.closest('[role="dialog"]');
		const fromShortcut = $tokenListReturnFocus === SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK;
		tokenListReturnFocus.set(undefined);

		if (nonNullish(token)) {
			onSelectToken(token);
		} else {
			onClose();
		}

		await tick();

		if (dialog?.isConnected) {
			const shortcut =
				isNullish(token) && fromShortcut
					? dialog.querySelector<HTMLElement>(
							`[data-tid="${SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK}"]:not([disabled])`
						)
					: undefined;

			(
				shortcut ??
				dialog.querySelector<HTMLElement>('[data-swap-receive-area] button:not([disabled])')
			)?.focus({ preventScroll: true });
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

	let sourceTokenId = $derived($sourceToken?.id);
	let sourceGroupId = $derived($sourceToken?.groupData?.id);
	let shownDestinationsFor = $state<{ tokenId: TokenId; groupId: TokenGroupId }>();
	let hadDestinations = $derived(
		nonNullish(shownDestinationsFor) &&
			shownDestinationsFor.tokenId === sourceTokenId &&
			shownDestinationsFor.groupId === sourceGroupId
	);

	$effect(() => {
		if (hadDestinations) {
			return;
		}

		// Record destinations after they render, and forget them when the pay token or group changes.
		shownDestinationsFor =
			nonNullish(sourceTokenId) && nonNullish(otherNetwork)
				? { tokenId: sourceTokenId, groupId: otherNetwork.group.id }
				: undefined;
	});

	$effect.pre(() => {
		// Capture focus before the keyed rows update. Only move it if the focused row disappears.
		otherNetwork;
		const focused = document.activeElement;

		if (isNullish(focused) || !list?.contains(focused)) {
			return;
		}

		void tick().then(() => {
			if (!focused.isConnected && root?.isConnected && document.activeElement === document.body) {
				firstControl()?.focus();
			}
		});
	});

	const select = (token: Token) => {
		if ($tokenListReturnFocus === SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK && nonNullish($sourceToken)) {
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
		bind:this={list}
		class="mb-4 flex flex-col overflow-y-auto overscroll-contain sm:max-h-[26rem]"
		data-tid={SWAP_RECEIVE_NETWORK_LIST}
	>
		{#if nonNullish(otherNetwork)}
			{@const { group, tokens } = otherNetwork}
			<List noPadding>
				{#each tokens as token (token.id)}
					{@const symbol = getTokenDisplaySymbol(token)}
					<ListItem styleClass="first-of-type:border-t-1">
						<ModalTokensListItem
							onClick={() => select(token)}
							selected={token.id === $destinationToken?.id}
							{token}
						>
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
		<div class="text-primary" role="status">
			{#if isNullish(otherNetwork)}
				{@const symbol = getSwapMoveTokenSymbol($sourceToken)}
				<EmptyState
					description={hadDestinations && notEmptyString(symbol)
						? replacePlaceholders($i18n.swap.text.move_networks_changed_description, {
								$symbol: symbol
							})
						: $i18n.swap.text.move_no_networks_description}
					title={hadDestinations
						? $i18n.swap.text.move_networks_changed_title
						: notEmptyString(symbol)
							? replacePlaceholders($i18n.swap.text.move_no_networks_title, { $symbol: symbol })
							: $i18n.swap.text.move_no_networks_title_without_symbol}
				/>
			{/if}
		</div>
	</div>

	<ButtonGroup>
		<ButtonBack fullWidth onclick={() => returnToForm()} />
	</ButtonGroup>
</div>
