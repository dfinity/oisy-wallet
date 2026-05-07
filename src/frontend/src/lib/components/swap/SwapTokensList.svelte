<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { ONESEC_EVM_NETWORK_IDS } from '$lib/constants/swap.constants';
	import { allCrossChainSwapTokens, allSortedIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapSelectTokenType } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import type { TokenToggleable } from '$lib/types/token-toggleable';
	import type { TokenUi } from '$lib/types/token-ui';
	import { oneSecCompatibleDestinations } from '$lib/utils/onesec-swap.utils';
	import { filterSwapTokens } from '$lib/utils/swap-tokens-filter.utils';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { sortTokens } from '$lib/utils/tokens.utils';

	interface Props {
		side?: SwapSelectTokenType;
		onSelectToken: (token: Token) => void;
		onSelectNetworkFilter: () => void;
		onCloseTokensList: () => void;
	}

	let { side, onSelectToken, onSelectNetworkFilter, onCloseTokensList }: Props = $props();

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let compatibleTokenIds = $derived(
		side === 'destination' && nonNullish($sourceToken)
			? oneSecCompatibleDestinations({
					sourceToken: $sourceToken,
					networkIds: ONESEC_EVM_NETWORK_IDS
				})
			: undefined
	);

	let allSwapTokens: TokenToggleable<Token>[] = $derived(
		filterSwapTokens({
			tokens: [
				{ ...ICP_TOKEN, enabled: true },
				...$allSortedIcrcTokens,
				...$allCrossChainSwapTokens
			],
			supportedData: $swapSupportedTokensStore?.aggregated,
			compatibleTokenIds
		})
	);

	let tokensUi: TokenToggleable<TokenUi>[] = $derived(
		allSwapTokens
			.filter(
				(token: TokenToggleable<Token>) =>
					token.id !== $sourceToken?.id && token.id !== $destinationToken?.id
			)
			.map((token: TokenToggleable<Token>) =>
				mapTokenUi({
					token,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges
				})
			)
	);

	let tokens: TokenUi[] = $derived(
		sortTokens({
			$tokens: tokensUi,
			$tokensToPin,
			$networksToPin: $networks
		})
	);

	$effect(() => {
		setTokens(tokens);
	});

	const onTokenButtonClick = (token: TokenUi) => {
		onSelectToken(token);
	};
</script>

<ModalTokensList {onSelectNetworkFilter} {onTokenButtonClick}>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}
	{#snippet noResults()}
		<p class="text-primary">
			{$i18n.tokens.manage.text.all_tokens_zero_balance}
		</p>
	{/snippet}
	{#snippet toolbar()}
		<ButtonCancel fullWidth={true} onclick={onCloseTokensList} />
	{/snippet}
</ModalTokensList>
