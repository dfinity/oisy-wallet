<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import {
		type Snippet,
		createEventDispatcher,
		getContext,
		onMount,
		setContext,
		type Snippet
	} from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
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
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { ExchangesData } from '$lib/types/exchange';
	import type { Token } from '$lib/types/token';
	import { pinEnabledTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';

	let { initialSearch, infoElement }: { initialSearch?: string; infoElement?: Snippet } = $props();

	const dispatch = createEventDispatcher();

	// To avoid strange behavior when the exchange data changes (for example, the tokens may shift
	// since some of them are sorted by market cap), we store the exchange data in a variable during
	// the life of the component.
	let exchangesStaticData: ExchangesData | undefined = $state();

	onMount(() => {
		exchangesStaticData = nonNullish($exchanges) ? { ...$exchanges } : undefined;
	});

	let allTokensSorted: Token[] = $derived(
		nonNullish(exchangesStaticData)
			? pinEnabledTokensAtTop(
					sortTokens({
						$tokens: $allTokens,
						$exchanges: exchangesStaticData,
						$tokensToPin
					})
				)
			: []
	);

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: [],
			filterZeroBalance: false,
			filterNetwork: $selectedNetwork,
			filterQuery: nonNullish(initialSearch) ? initialSearch : '',
			sortByBalance: false
		})
	);

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	$effect(() => {
		setTokens(allTokensSorted);
	});

	let loading = $derived($erc20UserTokensNotInitialized);

	let showNetworks = $state(false);

	const onSelectNetwork = () => {
		showNetworks = !showNetworks;
	};

	let modifiedTokens: Record<string, Token> = $state({});

	const onToggle = ({ detail: { id, network, ...rest } }: CustomEvent<Token>) => {
		const { id: networkId } = network;
		const { [`${networkId.description}-${id.description}`]: current, ...tokens } = modifiedTokens;

		// we need to set the tokenlist for the ModalTokenListContext manually when we change the enabled prop,
		// because the exposed prop from the context is a derived and on update of the data the "enabled" gets reset
		const tokensList = [...allTokensSorted];
		const token = tokensList.find((t) => t.id === id);
		if (nonNullish(token) && 'enabled' in token) {
			token.enabled = !token.enabled;
			setTokens(tokensList);
		}

		if (nonNullish(current)) {
			modifiedTokens = { ...tokens };
			return;
		}

		modifiedTokens = {
			[`${networkId.description}-${id.description}`]: { id, network, ...rest },
			...tokens
		};
	};

	let saveDisabled = $derived(Object.keys(modifiedTokens).length === 0);

	// TODO: Technically, there could be a race condition where modifiedTokens and the derived group are not updated with the last change when the user clicks "Save." For example, if the user clicks on a radio button and then a few milliseconds later on the save button.
	// We might want to improve this in the future.
	const save = () => dispatch('icSave', modifiedTokens);
</script>

{#if nonNullish(infoElement)}
	{@render infoElement()}
{/if}

{#if showNetworks}
	<ModalNetworksFilter on:icNetworkFilter={() => (showNetworks = false)} />
{:else}
	<ModalTokensList
		{loading}
		networkSelectorViewOnly={nonNullish($selectedNetwork)}
		on:icSelectNetworkFilter={onSelectNetwork}
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
				disabled={$pseudoNetworkICPTestnet}
				onclick={() => dispatch('icAddToken')}
				><IconPlus /> {$i18n.tokens.manage.text.import_token}</Button
			>
			<Button disabled={saveDisabled} onclick={save} testId={MANAGE_TOKENS_MODAL_SAVE}>
				{$i18n.core.text.save}
			</Button>
		{/snippet}
	</ModalTokensList>
{/if}
