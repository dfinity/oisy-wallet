<script lang="ts">
	import { IconClose, Input } from '@dfinity/gix-components';
	import { createEventDispatcher, onMount } from 'svelte';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import IcManageTokenToggle from '$icp-eth/components/tokens/IcManageTokenToggle.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { fade } from 'svelte/transition';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import { icrcCustomTokens, icrcDefaultTokens } from '$icp/derived/icrc.derived';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import type { CanisterIdText } from '$lib/types/canister';
	import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import { ICP_TOKEN } from '$env/tokens.env';
	import { sortIcTokens } from '$icp/utils/icrc.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const dispatch = createEventDispatcher();

	// The list of Icrc tokens initialized as environments variables
	let icrcEnvTokens: IcrcCustomToken[] = [];
	onMount(() => {
		const tokens = buildIcrcCustomTokens();
		icrcEnvTokens =
			tokens?.map((token) => ({ ...token, id: Symbol(token.symbol), enabled: false })) ?? [];
	});

	// All the Icrc ledger ids including the default tokens and the user custom tokens regardless if enabled or disabled.
	let knownLedgerCanisterIds: LedgerCanisterIdText[] = [];
	$: knownLedgerCanisterIds = [
		...$icrcDefaultTokens.map(({ ledgerCanisterId }) => ledgerCanisterId),
		...$icrcCustomTokens.map(({ ledgerCanisterId }) => ledgerCanisterId)
	];

	// The entire list of tokens to display to the user.
	let allIcrcTokens: IcrcCustomToken[] = [];
	$: allIcrcTokens = [
		{
			...ICP_TOKEN,
			enabled: true
		},
		...$icrcDefaultTokens.map((token) => ({ ...token, enabled: true })),
		...$icrcCustomTokens,
		...icrcEnvTokens.filter(
			({ ledgerCanisterId }) => !knownLedgerCanisterIds.includes(ledgerCanisterId)
		)
	].sort(sortIcTokens);

	let filterTokens = '';
	const updateFilter = () => (filterTokens = filter);
	const debounceUpdateFilter = debounce(updateFilter);

	let filter = '';
	$: filter, debounceUpdateFilter();

	let filteredTokens: IcrcCustomToken[] = [];
	$: filteredTokens = isNullishOrEmpty(filterTokens)
		? allIcrcTokens
		: allIcrcTokens.filter(
				({ name, symbol, alternativeName }) =>
					name.toLowerCase().includes(filterTokens.toLowerCase()) ||
					symbol.toLowerCase().includes(filterTokens.toLowerCase()) ||
					(alternativeName ?? '').toLowerCase().includes(filterTokens.toLowerCase())
			);

	let tokens: IcrcCustomToken[] = [];
	$: tokens = filteredTokens.map(({ ledgerCanisterId, enabled, ...rest }) => ({
		ledgerCanisterId,
		enabled: modifiedTokens[`${ledgerCanisterId}`]?.enabled ?? enabled,
		...rest
	}));

	let noTokensMatch = false;
	$: noTokensMatch = tokens.length === 0;

	let modifiedTokens: Record<CanisterIdText, IcrcCustomToken> = {};
	const onToggle = ({
		detail: { ledgerCanisterId, enabled, ...rest }
	}: CustomEvent<IcrcCustomToken>) => {
		const { [`${ledgerCanisterId}`]: current, ...tokens } = modifiedTokens;

		if (nonNullish(current)) {
			modifiedTokens = { ...tokens };
			return;
		}

		modifiedTokens = {
			[`${ledgerCanisterId}`]: {
				ledgerCanisterId,
				enabled,
				...rest
			},
			...tokens
		};
	};

	let saveDisabled = true;
	$: saveDisabled = Object.keys(modifiedTokens).length === 0;

	const save = () => dispatch('icSave', Object.values(modifiedTokens));
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
	<div class="container md:max-h-96 pr-2 pt-1 overflow-y-auto">
		{#each tokens as token (token.symbol)}
			<Card>
				{token.name}

				<Logo
					src={token.icon}
					slot="icon"
					alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
					size="medium"
					color="white"
				/>

				<span class="break-all" slot="description">
					{token.symbol}
				</span>

				<IcManageTokenToggle slot="action" {token} on:icToken={onToggle} />
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
