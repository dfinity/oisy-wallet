<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { SWAP_RECEIVE_NETWORK_LIST } from '$lib/constants/test-ids.constants';
	import { crossChainSwapNetworksMainnets } from '$lib/derived/cross-chain-networks.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { allSwapUniverseTokens } from '$lib/derived/swap.derived';
	import { trackSwapReceiveShortcut } from '$lib/services/swap-receive-shortcut-analytics.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getReceiveShortcuts, getReceiveSwapTokens } from '$lib/utils/swap.utils';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { getTokenDisplaySymbol, mapTokenUi } from '$lib/utils/token.utils';

	interface Props {
		onSelectToken: (token: Token) => void;
		onClose: () => void;
	}

	let { onSelectToken, onClose }: Props = $props();

	const { sourceToken, receiveSupportedData } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	// The networks of "<symbol> on another network", from the same set as the shortcut and the list.
	let otherNetwork = $derived(
		nonNullish($sourceToken)
			? getReceiveShortcuts({
					sourceToken: $sourceToken,
					tokens: getReceiveSwapTokens({
						sourceToken: $sourceToken,
						supportedData: $receiveSupportedData,
						networks: $crossChainSwapNetworksMainnets,
						tokens: $allSwapUniverseTokens
					}),
					networks: $networks
				}).otherNetwork
			: undefined
	);

	let tokens = $derived(
		(otherNetwork?.tokens ?? []).map((token) =>
			mapTokenUi({ token, $balances: $balancesStore, $stakeBalances, $exchanges })
		)
	);

	const select = (token: Token) => {
		if (nonNullish($sourceToken)) {
			trackSwapReceiveShortcut({
				action: 'other_network',
				sourceToken: $sourceToken,
				destinationToken: token
			});
		}

		onSelectToken(token);
	};
</script>

<div
	class="mb-4 flex flex-col overflow-y-auto overscroll-contain sm:max-h-[26rem]"
	data-tid={SWAP_RECEIVE_NETWORK_LIST}
>
	<List noPadding>
		{#each tokens as token (token.id)}
			{@const symbol = getTokenDisplaySymbol(token)}
			<!-- Nothing loads the balance of a token that is not enabled, so it shows none, as in the list. -->
			{@const showBalance = !isTokenToggleable(token) || token.enabled}
			<ListItem styleClass="first-of-type:border-t-1">
				<LogoButton dividers fullWidth onClick={() => select(token)}>
					{#snippet logo()}
						<div class="mr-2">
							<TokenLogo badge={{ type: 'network' }} color="white" data={token} logoSize="lg" />
						</div>
					{/snippet}

					{#snippet title()}{token.network.name}{/snippet}

					{#snippet description()}
						{isNullish(otherNetwork) || symbol === otherNetwork.group.symbol
							? symbol
							: replacePlaceholders($i18n.swap.text.as_token, { $symbol: symbol })}
					{/snippet}

					{#snippet titleEnd()}
						{#if showBalance}
							<div class="ml-1 min-w-12 text-nowrap">
								<TokenBalance data={token} />
							</div>
						{/if}
					{/snippet}

					{#snippet descriptionEnd()}
						{#if showBalance}
							<ExchangeTokenValue data={token} />
						{/if}
					{/snippet}
				</LogoButton>
			</ListItem>
		{/each}
	</List>
</div>

<ButtonGroup>
	<ButtonCancel fullWidth onclick={onClose} />
</ButtonGroup>
