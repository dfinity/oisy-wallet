<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { allKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import { pinTokensWithBalanceAtTop } from '$lib/utils/tokens.utils';

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const dispatch = createEventDispatcher<{
		icSelectToken: IcTokenToggleable;
		icCloseTokensList: void;
	}>();

	let tokens: TokenUi<IcTokenToggleable>[];
	$: tokens = pinTokensWithBalanceAtTop({
		$tokens: [{ ...ICP_TOKEN, enabled: true }, ...$allKongSwapCompatibleIcrcTokens].filter(
			(token: Token) => token.id !== $sourceToken?.id && token.id !== $destinationToken?.id
		),
		$exchanges,
		$balances: $balancesStore
	});

	$: tokens, setTokens(tokens);

	const onIcTokenButtonClick = ({ detail: token }: CustomEvent<TokenUi<IcTokenToggleable>>) => {
		dispatch('icSelectToken', token);
	};
</script>

<ModalTokensList
	loading={false}
	networkSelectorViewOnly={true}
	on:icTokenButtonClick={onIcTokenButtonClick}
>
	<ButtonCancel slot="toolbar" fullWidth={true} on:click={() => dispatch('icCloseTokensList')} />
</ModalTokensList>
