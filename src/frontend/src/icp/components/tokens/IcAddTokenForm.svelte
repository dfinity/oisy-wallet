<script lang="ts">
	import { Input, Segment, SegmentButton } from '@dfinity/gix-components';
	import { createEventDispatcher, onMount } from 'svelte';
	import { debounce } from '@dfinity/utils';
	import { derived, type Readable, writable } from 'svelte/store';
	import { knownIcrcToken, knownIcrcTokens, type KnownIcrcTokens } from '$lib/types/known-token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import snsTokens from '$env/tokens.sns.json';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import { BigNumber } from '@ethersproject/bignumber';
	import Card from '$lib/components/ui/Card.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

	const dispatch = createEventDispatcher();

	let icrcTokens: KnownIcrcTokens = [];
	onMount(() => {
		try {
			icrcTokens = knownIcrcTokens.parse(
				snsTokens.map(
					({
						metadata: {
							fee: { __bigint__ },
							...rest
						},
						...ids
					}) =>
						knownIcrcToken.parse({
							...ids,
							metadata: {
								...rest,
								fee: BigInt(__bigint__)
							}
						})
				)
			);
		} catch (err: unknown) {
			console.error(err);
		}
	});

	let filter = '';

	const filterStore = writable<string>('');
	const updateFilter = () => filterStore.set(filter);
	const debounceUpdateFilter = debounce(updateFilter);

	$: filter, debounceUpdateFilter();

	let tokens: KnownIcrcTokens = [];
	$: tokens = isNullishOrEmpty($filterStore)
		? icrcTokens
		: icrcTokens.filter(
				({ metadata: { name, symbol, alternativeName } }) =>
					name.toLowerCase().includes($filterStore.toLowerCase()) ||
					symbol.toLowerCase().includes($filterStore.toLowerCase()) ||
					(alternativeName ?? '').toLowerCase().includes($filterStore.toLowerCase())
			);
</script>

<Input
	name="filter"
	inputType="text"
	required
	bind:value={filter}
	placeholder={$i18n.tokens.placeholder.search_token}
	spellcheck={false}
/>

<div class="container mt-4 h-96 overflow-y-auto">
	{#each tokens as token}
		<Card>
			{token.metadata.name}

			<Logo
				src={`/icons/sns/${token.ledgerCanisterId}.png`}
				slot="icon"
				alt={`${token.metadata.name} logo`}
				size="52px"
				color="white"
			/>

			<span class="break-all" slot="description">
				{token.metadata.symbol}
			</span>
		</Card>
	{/each}
</div>

<ButtonGroup>
	<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
		>{$i18n.core.text.back}</button
	>
	<button class="primary block flex-1" on:click={() => dispatch('icSend')}>
		{$i18n.core.text.save}
	</button>
</ButtonGroup>

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
