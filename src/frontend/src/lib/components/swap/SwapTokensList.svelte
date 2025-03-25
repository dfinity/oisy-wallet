<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { allKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import { pinTokensWithBalanceAtTop } from '$lib/utils/tokens.utils';

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const dispatch = createEventDispatcher<{
		icSelectToken: IcTokenToggleable;
		icCloseTokensList: void;
	}>();

	let tokens: TokenUi<IcTokenToggleable>[];
	$: tokens = pinTokensWithBalanceAtTop({
		$tokens: [{ ...ICP_TOKEN, enabled: true }, ...$allKongSwapCompatibleIcrcTokens].filter(
			(token: Token) => token.id !== $sourceToken?.id && token.id !== $destinationToken?.id
		),
		$exchanges: $exchanges,
		$balances: $balancesStore
	});

	const onIcTokenButtonClick = ({ detail: token }: CustomEvent<TokenUi<IcTokenToggleable>>) => {
		dispatch('icSelectToken', token);
	};
</script>

<ModalTokensList {tokens} loading={false} on:icTokenButtonClick={onIcTokenButtonClick}>
	<ButtonCancel slot="toolbar" fullWidth={true} on:click={() => dispatch('icCloseTokensList')} />
</ModalTokensList>
