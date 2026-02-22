<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, onMount, setContext, type Snippet, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import EnableTokenToggle from '$lib/components/tokens/EnableTokenToggle.svelte';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { MANAGE_TOKENS_MODAL_SAVE } from '$lib/constants/test-ids.constants';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { pseudoNetworkICPTestnet, selectedNetwork } from '$lib/derived/network.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { ExchangesData } from '$lib/types/exchange';
	import type { Network } from '$lib/types/network';
	import type { Token, TokenId } from '$lib/types/token';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { pinEnabledTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';

	interface Props {
		network?: Network;
		initialSearch?: string;
		infoElement?: Snippet;
		isNftsPage?: boolean;
		onSave: (tokens: Token[]) => void;
		onAddToken: () => void;
	}

	let {
		network = $bindable(),
		initialSearch,
		infoElement,
		isNftsPage,
		onSave,
		onAddToken
	}: Props = $props();

	// To avoid strange behaviour when the exchange data changes (for example, the tokens may shift
	// since some of them are sorted by market cap), we store the exchange data in a variable during
	// the life of the component.
	let exchangesStaticData: ExchangesData | undefined = $state();

	onMount(() => {
		exchangesStaticData = nonNullish($exchanges) ? { ...$exchanges } : undefined;

		return () => {
			modifiedTokens.clear();
			userHasEdited = false;
			tokensInContext = [];
		};
	});

	let allTokensSorted: Token[] = $derived(
		nonNullish(exchangesStaticData)
			? pinEnabledTokensAtTop(
					sortTokens({
						$tokens: $allTokens,
						$balances: $balancesStore,
						$stakeBalances,
						$exchanges: exchangesStaticData,
						$tokensToPin
					})
				)
			: []
	);

	let tokensInContext: Token[] = $state([]);

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: [],
			filterZeroBalance: false,
			filterNetwork: network ?? $selectedNetwork,
			// TODO: This statement is not reactive. Check if it is intentional or not.
			// eslint-disable-next-line svelte/no-unused-svelte-ignore
			// svelte-ignore state_referenced_locally
			filterQuery: nonNullish(initialSearch) ? initialSearch : '',
			sortByBalance: false,
			// TODO: This statement is not reactive. Check if it is intentional or not.
			// eslint-disable-next-line svelte/no-unused-svelte-ignore
			// svelte-ignore state_referenced_locally
			filterNfts: isNftsPage
		})
	);

	const { setTokens, filterNetwork } = getContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY
	);

	const updateContextTokens = () => {
		// Keep the context list in sync only until the user starts editing.
		// This prevents overwriting the locally toggled enabled state.
		if (!userHasEdited) {
			tokensInContext = allTokensSorted;
			setTokens(allTokensSorted);
		}
	};

	$effect(() => {
		[userHasEdited, allTokensSorted];

		untrack(() => updateContextTokens());
	});

	$effect(() => {
		if (nonNullish($filterNetwork)) {
			network = $filterNetwork;
		}
	});

	let showNetworks = $state(false);

	const onSelectNetwork = () => {
		showNetworks = !showNetworks;
	};

	const modifiedTokens = new SvelteMap<TokenId, Token>();

	let userHasEdited = $state(false);

	const onToggle = ({ id, ...rest }: Token) => {
		const current = modifiedTokens.get(id);

		// we need to set the tokenlist for the ModalTokenListContext manually when we change the enabled prop,
		// because the exposed prop from the context is a derived and on update of the data the "enabled" gets reset
		userHasEdited = true;
		const tokensList = tokensInContext.map((t) =>
			t.id === id && isTokenToggleable(t) ? { ...t, enabled: !t.enabled } : t
		);
		tokensInContext = tokensList;
		setTokens(tokensList);

		if (nonNullish(current)) {
			modifiedTokens.delete(id);
			return;
		}

		modifiedTokens.set(id, { id, ...rest });
	};

	let tokensToBeSaved = $derived([...modifiedTokens.values()]);

	let saveDisabled = $derived(tokensToBeSaved.length === 0);

	// TODO: Technically, there could be a race condition where modifiedTokens and the derived group are not updated with the last change when the user clicks "Save." For example, if the user clicks on a radio button and then a few milliseconds later on the save button.
	// We might want to improve this in the future.
	const save = () => onSave(tokensToBeSaved);
</script>

{#if nonNullish(infoElement)}
	{@render infoElement()}
{/if}

{#if showNetworks}
	<ModalNetworksFilter onNetworkFilter={() => (showNetworks = false)} />
{:else}
	<ModalTokensList
		networkSelectorViewOnly={nonNullish($selectedNetwork)}
		onSelectNetworkFilter={onSelectNetwork}
	>
		{#snippet tokenListItem(token)}
			<LogoButton dividers hover={false}>
				{#snippet title()}
					{nonNullish(token.oisySymbol) ? token.oisySymbol.oisySymbol : token.symbol}
				{/snippet}

				{#snippet subtitle()}
					{token.name}
				{/snippet}

				{#snippet logo()}
					<span class="mr-2">
						<TokenLogo badge={{ type: 'network' }} color="white" data={token} />
					</span>
				{/snippet}

				{#snippet description()}
					<span class="break-all">
						{token.network.name}
					</span>
				{/snippet}

				{#snippet action()}
					<EnableTokenToggle {onToggle} {token} />
				{/snippet}
			</LogoButton>
		{/snippet}
		{#snippet toolbar()}
			<Button
				colorStyle="secondary-light"
				disabled={$pseudoNetworkICPTestnet ||
					(isNftsPage && nonNullish($selectedNetwork) && !$selectedNetwork.supportsNft)}
				onclick={onAddToken}
				><IconPlus />
				{isNftsPage
					? $i18n.tokens.manage.text.import_nft
					: $i18n.tokens.manage.text.import_token}</Button
			>
			<Button disabled={saveDisabled} onclick={save} testId={MANAGE_TOKENS_MODAL_SAVE}>
				{$i18n.core.text.save}
			</Button>
		{/snippet}
	</ModalTokensList>
{/if}
