<script lang="ts">
	import { IconClose, Input } from '@dfinity/gix-components';
	import { createEventDispatcher, onMount } from 'svelte';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Card from '$lib/components/ui/Card.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { fade } from 'svelte/transition';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { ICP_TOKEN } from '$env/tokens.env';
	import { icTokenIcrcCustomToken, sortIcTokens } from '$icp/utils/icrc.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { Token } from '$lib/types/token';
	import ManageTokenToggle from '$lib/components/tokens/ManageTokenToggle.svelte';
	import {
		networkEthereum,
		networkICP,
		pseudoNetworkChainFusion,
		selectedNetwork
	} from '$lib/derived/network.derived';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { Erc20UserToken, EthereumUserToken } from '$eth/types/erc20-user-token';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { icTokenErc20UserToken, icTokenEthereumUserToken } from '$eth/utils/erc20.utils';
	import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
	import type { IcCkToken } from '$icp/types/ic';
	import { pinTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import type { ExchangesData } from '$lib/types/exchange';

	const dispatch = createEventDispatcher();

	// The list of ICRC tokens (SNSes) is defined as environment variables.
	// These tokens are not necessarily loaded at boot time if the user has not added them to their list of custom tokens.
	let icrcEnvTokens: IcrcCustomToken[] = [];

	// To avoid strange behavior when the exchange data changes (for example, the tokens may shift
	// since some of them are sorted by market cap), we store the exchange data in a variable during
	// the life of the component.
	let exchangesStaticData: ExchangesData | undefined;

	onMount(() => {
		const tokens = buildIcrcCustomTokens();
		icrcEnvTokens =
			tokens?.map((token) => ({ ...token, id: Symbol(token.symbol), enabled: false })) ?? [];

		exchangesStaticData = nonNullish($exchanges) ? { ...$exchanges } : undefined;
	});

	// All the Icrc ledger ids including the default tokens and the user custom tokens regardless if enabled or disabled.
	let knownLedgerCanisterIds: LedgerCanisterIdText[] = [];
	$: knownLedgerCanisterIds = $icrcTokens.map(({ ledgerCanisterId }) => ledgerCanisterId);

	// The entire list of ICRC tokens to display to the user:
	// This includes the default tokens (disabled or enabled), the custom tokens (disabled or enabled), and the environment tokens that have never been used.
	let allIcrcTokens: IcrcCustomToken[] = [];
	$: allIcrcTokens = [
		...$icrcTokens,
		...icrcEnvTokens.filter(
			({ ledgerCanisterId }) => !knownLedgerCanisterIds.includes(ledgerCanisterId)
		)
	].sort(sortIcTokens);

	// The entire list of Erc20 tokens to display to the user.
	let allErc20Tokens: EthereumUserToken[] = [];
	$: allErc20Tokens = $erc20Tokens;

	let manageIcTokens = false;
	$: manageIcTokens = $pseudoNetworkChainFusion || $networkICP;

	let manageEthereumTokens = false;
	$: manageEthereumTokens = $pseudoNetworkChainFusion || $networkEthereum;

	// TODO: Bitcoin tokens ($enabledBitcoinTokens) are not included yet.
	let allTokens: Token[] = [];
	$: allTokens = filterTokensForSelectedNetwork([
		[
			{
				...ICP_TOKEN,
				enabled: true
			},
			...$enabledEthereumTokens.map((token) => ({ ...token, enabled: true })),
			...(manageEthereumTokens ? allErc20Tokens : []),
			...(manageIcTokens ? allIcrcTokens : [])
		],
		$selectedNetwork,
		$pseudoNetworkChainFusion
	]);

	let allTokensSorted: Token[] = [];
	$: allTokensSorted = nonNullish(exchangesStaticData)
		? pinTokensAtTop({
				$tokens: sortTokens({ $tokens: allTokens, $exchanges: exchangesStaticData }),
				$tokensToPin: $tokensToPin
			})
		: [];

	let filterTokens = '';
	const updateFilter = () => (filterTokens = filter);
	const debounceUpdateFilter = debounce(updateFilter);

	let filter = '';
	$: filter, debounceUpdateFilter();

	const matchingToken = (token: Token): boolean =>
		token.name.toLowerCase().includes(filterTokens.toLowerCase()) ||
		token.symbol.toLowerCase().includes(filterTokens.toLowerCase()) ||
		(icTokenIcrcCustomToken(token) &&
			(token.alternativeName ?? '').toLowerCase().includes(filterTokens.toLowerCase()));

	let filteredTokens: Token[] = [];
	$: filteredTokens = isNullishOrEmpty(filterTokens)
		? allTokensSorted
		: allTokensSorted.filter((token) => {
				const twinToken = (token as IcCkToken).twinToken;
				return matchingToken(token) || (nonNullish(twinToken) && matchingToken(twinToken));
			});

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

	let groupModifiedTokens: { icrc: IcrcCustomToken[]; erc20: Erc20UserToken[] } = {
		icrc: [],
		erc20: []
	};
	$: groupModifiedTokens = Object.values(modifiedTokens).reduce(
		({ icrc, erc20 }, token) => ({
			icrc: [...icrc, ...(token.standard === 'icrc' ? [token as IcrcCustomToken] : [])],
			erc20: [
				...erc20,
				...(token.standard === 'erc20' && icTokenErc20UserToken(token) ? [token] : [])
			]
		}),
		{ icrc: [], erc20: [] } as { icrc: IcrcCustomToken[]; erc20: Erc20UserToken[] }
	);

	// TODO: Technically, there could be a race condition where modifiedTokens and the derived group are not updated with the last change when the user clicks "Save." For example, if the user clicks on a radio button and then a few milliseconds later on the save button.
	// We might want to improve this in the future.
	const save = () => dispatch('icSave', groupModifiedTokens);
</script>

<div class="mb-4">
	<Input
		name="filter"
		inputType="text"
		bind:value={filter}
		placeholder={$i18n.tokens.placeholder.search_token}
		spellcheck={false}
	>
		<svelte:fragment slot="inner-end">
			{#if noTokensMatch}
				<button on:click={() => (filter = '')} aria-label={$i18n.tokens.manage.text.clear_filter}>
					<IconClose />
				</button>
			{:else}
				<IconSearch />
			{/if}
		</svelte:fragment>
	</Input>
</div>

{#if nonNullish($selectedNetwork)}
	<p class="text-misty-rose pt-1 pb-2 mb-4">
		{replacePlaceholders($i18n.tokens.manage.text.manage_for_network, {
			$network: $selectedNetwork.name
		})}
	</p>
{/if}

{#if noTokensMatch}
	<button
		class="flex flex-col items-center justify-center py-16 w-full"
		in:fade
		on:click={() => dispatch('icAddToken')}
	>
		<span class="text-7xl">🤔</span>

		<span class="py-4 text-center text-blue font-bold no-underline"
			>+ {$i18n.tokens.manage.text.do_not_see_import}</span
		>
	</button>
{:else}
	<div class="container md:max-h-[26rem] pr-2 pt-1 overflow-y-auto overscroll-contain">
		{#each tokens as token (`${token.network.id.description}-${token.id.description}`)}
			<Card>
				{token.name}

				<TokenLogo slot="icon" color="white" {token} />

				<span class="break-all" slot="description">
					{token.symbol}
				</span>

				<svelte:fragment slot="action">
					{#if icTokenIcrcCustomToken(token)}
						<IcManageTokenToggle {token} on:icToken={onToggle} />
					{:else if icTokenEthereumUserToken(token)}
						<ManageTokenToggle {token} on:icShowOrHideToken={onToggle} />
					{/if}
				</svelte:fragment>
			</Card>
		{/each}
	</div>

	<Hr />

	<button
		class="flex justify-center pt-4 pb-5 text-center w-full text-blue font-bold no-underline"
		on:click={() => dispatch('icAddToken')}>+ {$i18n.tokens.manage.text.do_not_see_import}</button
	>

	<ButtonGroup>
		<button class="secondary block flex-1" on:click={() => dispatch('icClose')}
			>{$i18n.core.text.cancel}</button
		>
		<button
			class="primary block flex-1"
			on:click={save}
			class:opacity-10={saveDisabled}
			disabled={saveDisabled}
		>
			{$i18n.core.text.save}
		</button>
	</ButtonGroup>
{/if}

<style lang="scss">
	.container {
		&::-webkit-scrollbar-thumb {
			background-color: #d9d9d9;
		}

		&::-webkit-scrollbar-track {
			border-radius: var(--padding-2x);
			-webkit-border-radius: var(--padding-2x);
		}

		&::-webkit-scrollbar-thumb {
			border-radius: var(--padding-2x);
			-webkit-border-radius: var(--padding-2x);
		}
	}
</style>
