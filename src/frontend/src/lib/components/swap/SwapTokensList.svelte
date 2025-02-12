<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { allKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import { isDesktop } from '$lib/utils/device.utils';
	import { filterTokens, pinTokensWithBalanceAtTop } from '$lib/utils/tokens.utils';

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const dispatch = createEventDispatcher<{
		icSelectToken: IcTokenToggleable;
		icCloseTokensList: void;
	}>();

	let filter = '';

	let noTokensMatch = false;
	$: noTokensMatch = filteredTokens.length === 0;

	let tokens: TokenUi<IcTokenToggleable>[];
	$: tokens = pinTokensWithBalanceAtTop({
		$tokens: [{ ...ICP_TOKEN, enabled: true }, ...$allKongSwapCompatibleIcrcTokens].filter(
			(token: Token) => token.id !== $sourceToken?.id && token.id !== $destinationToken?.id
		),
		$exchanges: $exchanges,
		$balances: $balancesStore
	});

	let filteredTokens: TokenUi<IcTokenToggleable>[] = [];
	$: filteredTokens = filterTokens({ tokens, filter });
</script>

<InputSearch
	bind:filter
	noMatch={noTokensMatch}
	placeholder={$i18n.tokens.placeholder.search_token}
	autofocus={isDesktop()}
/>

<div class="my-6 sm:max-h-[26rem] flex flex-col overflow-y-hidden">
	<div class="tokens-scroll gap-6 flex flex-col overflow-y-auto overscroll-contain">
		{#each filteredTokens as token (token.id)}
			<TokenCardWithOnClick on:click={() => dispatch('icSelectToken', token)}>
				<TokenCardContent data={token} />
			</TokenCardWithOnClick>
		{/each}
	</div>
</div>

<ButtonGroup>
	<ButtonCancel on:click={() => dispatch('icCloseTokensList')} />
</ButtonGroup>
