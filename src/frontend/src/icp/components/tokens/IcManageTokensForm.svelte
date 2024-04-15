<script lang="ts">
	import { IconClose, Input } from '@dfinity/gix-components';
	import { createEventDispatcher, onMount } from 'svelte';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { writable } from 'svelte/store';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import IcManageTokenToggle from '$icp/components/tokens/IcManageTokenToggle.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { fade } from 'svelte/transition';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import { buildKnownIcrcTokens } from '$icp/services/token.service';
	import { icrcLedgerCanisterIds, sortedIcrcTokens } from '$icp/derived/icrc.derived';
	import type { IcrcManageableToken } from '$icp/types/token';
	import type { CanisterIdText } from '$lib/types/canister';

	const dispatch = createEventDispatcher();

	let knownIcrcTokens: IcrcManageableToken[] = [];
	onMount(() => {
		const { result, tokens } = buildKnownIcrcTokens();

		if (result === 'error') {
			return;
		}

		knownIcrcTokens = tokens?.map((token) => ({ ...token, enabled: false })) ?? [];
	});

	let allIcrcTokens: IcrcManageableToken[] = [];
	$: allIcrcTokens = [
		...$sortedIcrcTokens.map((token) => ({ ...token, enabled: true })),
		...knownIcrcTokens.filter(
			({ ledgerCanisterId }) => !$icrcLedgerCanisterIds.includes(ledgerCanisterId)
		)
	];

	const filterStore = writable<string>('');
	const updateFilter = () => filterStore.set(filter);
	const debounceUpdateFilter = debounce(updateFilter);

	let filter = '';
	$: filter, debounceUpdateFilter();

	let tokens: IcrcManageableToken[] = [];
	$: tokens = isNullishOrEmpty($filterStore)
		? allIcrcTokens
		: allIcrcTokens.filter(
				({ name, symbol, alternativeName }) =>
					name.toLowerCase().includes($filterStore.toLowerCase()) ||
					symbol.toLowerCase().includes($filterStore.toLowerCase()) ||
					(alternativeName ?? '').toLowerCase().includes($filterStore.toLowerCase())
			);

	let noTokensMatch = false;
	$: noTokensMatch = tokens.length === 0;

	let modifiedTokens: Record<CanisterIdText, IcrcManageableToken> = {};
	const onToggle = ({
		detail: { ledgerCanisterId, enabled, ...rest }
	}: CustomEvent<IcrcManageableToken>) => {
		const { [`${ledgerCanisterId}`]: current, ...tokens } = modifiedTokens;

		if (nonNullish(current) && current.enabled === enabled) {
			modifiedTokens = { ...tokens };
			return;
		}

		modifiedTokens = {
			ledgerCanisterId: {
				ledgerCanisterId,
				enabled,
				...rest
			},
			...tokens
		};
	};

	let saveDisabled = true;
	$: saveDisabled = Object.keys(modifiedTokens).length === 0;
</script>

<Input
	name="filter"
	inputType="text"
	required
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
	<div class="container mt-4 h-96 pr-2 mb-1 pt-1 overflow-y-auto">
		{#each tokens as token}
			<Card>
				{token.name}

				<Logo
					src={token.icon ?? `/icons/sns/${token.ledgerCanisterId}.png`}
					slot="icon"
					alt={`${token.name} logo`}
					size="52px"
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
		<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
			>{$i18n.core.text.back}</button
		>
		<button
			class="primary block flex-1"
			on:click={() => dispatch('icSave')}
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
