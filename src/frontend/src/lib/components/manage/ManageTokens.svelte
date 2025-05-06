<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, onMount, setContext, type Snippet } from 'svelte';
	import BtcManageTokenToggle from '$btc/components/tokens/BtcManageTokenToggle.svelte';
	import { isBitcoinToken } from '$btc/utils/token.utils';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import type { Erc20UserToken } from '$eth/types/erc20-user-token';
	import { icTokenErc20UserToken, icTokenEthereumUserToken } from '$eth/utils/erc20.utils';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import ManageTokenToggle from '$lib/components/tokens/ManageTokenToggle.svelte';
	import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { MANAGE_TOKENS_MODAL_SAVE } from '$lib/constants/test-ids.constants';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
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
	import SolManageTokenToggle from '$sol/components/tokens/SolManageTokenToggle.svelte';
	import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
	import { isTokenSplToggleable } from '$sol/utils/spl.utils';
	import { isSolanaToken } from '$sol/utils/token.utils';

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

	let loading = $erc20UserTokensNotInitialized;

	let showNetworks = $state(false);

	const onSelectNetwork = () => {
		showNetworks = !showNetworks;
	};

	let modifiedTokens: Record<string, Token> = $state({});

	const onToggle = ({ detail: { id, network, ...rest } }: CustomEvent<Token>) => {
		const { id: networkId } = network;
		const { [`${networkId.description}-${id.description}`]: current, ...tokens } = modifiedTokens;

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

	let groupModifiedTokens = $derived(
		Object.values(modifiedTokens).reduce<{
			icrc: IcrcCustomToken[];
			erc20: Erc20UserToken[];
			spl: SplTokenToggleable[];
		}>(
			({ icrc, erc20, spl }, token) => ({
				icrc: [...icrc, ...(token.standard === 'icrc' ? [token as IcrcCustomToken] : [])],
				erc20: [
					...erc20,
					...(token.standard === 'erc20' && icTokenErc20UserToken(token) ? [token] : [])
				],
				spl: [...spl, ...(isTokenSplToggleable(token) ? [token] : [])]
			}),
			{ icrc: [], erc20: [], spl: [] }
		)
	);

	// TODO: Technically, there could be a race condition where modifiedTokens and the derived group are not updated with the last change when the user clicks "Save." For example, if the user clicks on a radio button and then a few milliseconds later on the save button.
	// We might want to improve this in the future.
	const save = () => dispatch('icSave', groupModifiedTokens);
</script>

{#if nonNullish(infoElement)}
	{@render infoElement()}
{/if}

{#if showNetworks}
	<ModalNetworksFilter on:icNetworkFilter={() => (showNetworks = false)} />
{:else}
	<ModalTokensList
		{loading}
		on:icSelectNetworkFilter={onSelectNetwork}
		networkSelectorViewOnly={nonNullish($selectedNetwork)}
	>
		{#snippet tokenListItem(token)}
			<LogoButton dividers hover={false}>
				<span slot="title">{token.symbol}</span>
				<span slot="subtitle">{token.name}</span>

				<span slot="logo" class="mr-2">
					<TokenLogo color="white" data={token} badge={{ type: 'network' }} />
				</span>

				<span class="break-all" slot="description">
					{token.network.name}
				</span>

				<svelte:fragment slot="action">
					{#if icTokenIcrcCustomToken(token)}
						<IcManageTokenToggle {token} on:icToken={onToggle} />
					{:else if icTokenEthereumUserToken(token) || isTokenSplToggleable(token)}
						<ManageTokenToggle {token} on:icShowOrHideToken={onToggle} />
					{:else if isBitcoinToken(token)}
						<BtcManageTokenToggle />
					{:else if isSolanaToken(token)}
						<SolManageTokenToggle />
					{/if}
				</svelte:fragment>
			</LogoButton>
		{/snippet}
		{#snippet toolbar()}
			<Button colorStyle="secondary-light" on:click={() => dispatch('icAddToken')}
				><IconPlus /> {$i18n.tokens.manage.text.import_token}</Button
			>
			<Button testId={MANAGE_TOKENS_MODAL_SAVE} disabled={saveDisabled} on:click={save}>
				{$i18n.core.text.save}
			</Button>
		{/snippet}
	</ModalTokensList>
{/if}
