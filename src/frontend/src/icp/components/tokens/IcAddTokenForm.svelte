<script lang="ts">
	import { Input, Segment, SegmentButton } from '@dfinity/gix-components';
	import { createEventDispatcher, onMount } from 'svelte';
	import { debounce } from '@dfinity/utils';
	import { derived, type Readable, writable } from 'svelte/store';
	import { knownIcrcToken, knownIcrcTokens, type KnownIcrcTokens } from '$lib/types/known-token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import snsTokens from '$env/tokens.sns.json';

	const dispatch = createEventDispatcher();

	let snsSegmentId = Symbol();
	let customSegmentId = Symbol();

	let selectedSegmentId = snsSegmentId;

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

	const tokens: Readable<KnownIcrcTokens> = derived([filterStore], ([$filterStore]) =>
		isNullishOrEmpty($filterStore)
			? []
			: icrcTokens.filter(
					({ metadata: { name, symbol, alternativeName } }) =>
						name.toLowerCase().includes($filterStore.toLowerCase()) ||
						symbol.toLowerCase().includes($filterStore.toLowerCase()) ||
						(alternativeName ?? '').toLowerCase().includes($filterStore.toLowerCase())
				)
	);
</script>

<Segment bind:selectedSegmentId>
	<SegmentButton segmentId={snsSegmentId}>Sns</SegmentButton>
	<SegmentButton segmentId={customSegmentId}>Custom</SegmentButton>
</Segment>

<label for="filter" class="font-bold px-4.5">Filter:</label>
<Input
	name="filter"
	inputType="text"
	required
	bind:value={filter}
	placeholder="Filter"
	spellcheck={false}
/>

{#each $tokens as token}
	<button on:click={() => dispatch('icToken', token)}
		>{token.ledgerCanisterId} - {token.metadata.name}</button
	>
{/each}
