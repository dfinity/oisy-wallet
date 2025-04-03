<script lang="ts">
	import { debounce, nonNullish, notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import BtcManageTokenToggle from '$btc/components/tokens/BtcManageTokenToggle.svelte';
	import { isBitcoinToken } from '$btc/utils/token.utils';
	import type { Erc20UserToken } from '$eth/types/erc20-user-token';
	import { icTokenErc20UserToken, icTokenEthereumUserToken } from '$eth/utils/erc20.utils';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import ManageTokenToggle from '$lib/components/tokens/ManageTokenToggle.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import {
		MANAGE_TOKENS_MODAL_CLOSE,
		MANAGE_TOKENS_MODAL_SAVE
	} from '$lib/constants/test-ids.constants';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ExchangesData } from '$lib/types/exchange';
	import type { Token } from '$lib/types/token';
	import type { TokenToggleable } from '$lib/types/token-toggleable';
	import { isDesktop } from '$lib/utils/device.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
	import { filterTokens, pinEnabledTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';
	import SolManageTokenToggle from '$sol/components/tokens/SolManageTokenToggle.svelte';
	import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
	import { isTokenSplToggleable } from '$sol/utils/spl.utils';
	import { isSolanaToken } from '$sol/utils/token.utils';

	export let initialSearch: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	// To avoid strange behavior when the exchange data changes (for example, the tokens may shift
	// since some of them are sorted by market cap), we store the exchange data in a variable during
	// the life of the component.
	let exchangesStaticData: ExchangesData | undefined;

	onMount(() => {
		exchangesStaticData = nonNullish($exchanges) ? { ...$exchanges } : undefined;
	});

	let allTokensForSelectedNetwork: TokenToggleable<Token>[] = [];
	$: allTokensForSelectedNetwork = filterTokensForSelectedNetwork([
		$allTokens,
		$selectedNetwork,
		$pseudoNetworkChainFusion
	]);

	let allTokensSorted: Token[] = [];
	$: allTokensSorted = nonNullish(exchangesStaticData)
		? pinEnabledTokensAtTop(
				sortTokens({
					$tokens: allTokensForSelectedNetwork,
					$exchanges: exchangesStaticData,
					$tokensToPin: $tokensToPin
				})
			)
		: [];

	let tokensFilter = '';
	const updateFilter = () => (tokensFilter = filter);
	const debounceUpdateFilter = debounce(updateFilter);

	let filter = initialSearch ?? '';
	$: filter, debounceUpdateFilter();

	let filteredTokens: Token[] = [];
	$: filteredTokens = filterTokens({ tokens: allTokensSorted, filter: tokensFilter });

	let tokens: Token[] = [];
	$: tokens = filteredTokens.map((token) => {
		const modifiedToken = modifiedTokens[`${token.network.id.description}-${token.id.description}`];

		return {
			...token,
			...(icTokenIcrcCustomToken(token)
				? {
						enabled: (modifiedToken as IcrcCustomToken)?.enabled ?? token.enabled
					}
				: {})
		};
	});

	let noTokensMatch = false;
	$: noTokensMatch = tokens.length === 0;

	let modifiedTokens: Record<string, Token> = {};
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

	let saveDisabled = true;
	$: saveDisabled = Object.keys(modifiedTokens).length === 0;

	let groupModifiedTokens: {
		icrc: IcrcCustomToken[];
		erc20: Erc20UserToken[];
		spl: SplTokenToggleable[];
	} = {
		icrc: [],
		erc20: [],
		spl: []
	};
	$: groupModifiedTokens = Object.values(modifiedTokens).reduce<{
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
	);

	// TODO: Technically, there could be a race condition where modifiedTokens and the derived group are not updated with the last change when the user clicks "Save." For example, if the user clicks on a radio button and then a few milliseconds later on the save button.
	// We might want to improve this in the future.
	const save = () => dispatch('icSave', groupModifiedTokens);
</script>

<div class="mb-4">
	<InputSearch
		bind:filter
		showResetButton={notEmptyString(filter)}
		placeholder={$i18n.tokens.placeholder.search_token}
		autofocus={isDesktop()}
	/>
</div>

{#if nonNullish($selectedNetwork)}
	<p class="mb-4 pb-2 pt-1 text-tertiary">
		{replacePlaceholders($i18n.tokens.manage.text.manage_for_network, {
			$network: $selectedNetwork.name
		})}
	</p>
{/if}

<slot name="info-element" />

{#if noTokensMatch}
	<button
		class="flex w-full flex-col items-center justify-center py-16"
		in:fade
		on:click={() => dispatch('icAddToken')}
	>
		<span class="text-7xl">🤔</span>

		<span class="py-4 text-center font-bold text-brand-primary-alt no-underline"
			>+ {$i18n.tokens.manage.text.do_not_see_import}</span
		>
	</button>
{:else}
	<div class="flex flex-col overflow-y-hidden py-3 sm:max-h-[26rem]">
		<div class="my-3 overflow-y-auto overscroll-contain">
			{#each tokens as token (`${token.network.id.description}-${token.id.description}`)}
				<Card>
					<TokenName data={token} />

					<TokenLogo slot="icon" color="white" data={token} badge={{ type: 'network' }} />

					<span class="break-all" slot="description">
						{token.symbol}
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
				</Card>
			{/each}
		</div>
	</div>

	<button
		class="mb-4 flex w-full justify-center pt-4 text-center font-bold text-brand-primary-alt no-underline"
		on:click={() => dispatch('icAddToken')}>+ {$i18n.tokens.manage.text.do_not_see_import}</button
	>

	<ButtonGroup>
		<ButtonCancel testId={MANAGE_TOKENS_MODAL_CLOSE} on:click={() => dispatch('icClose')} />
		<Button testId={MANAGE_TOKENS_MODAL_SAVE} disabled={saveDisabled} on:click={save}>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
{/if}
