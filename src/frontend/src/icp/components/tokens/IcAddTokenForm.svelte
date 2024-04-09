<script lang="ts">
	import { Input, Segment, SegmentButton } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import type { IcCanisters } from '$icp/types/ic';
	import { isNullish } from '@dfinity/utils';

	export let canisters: Partial<IcCanisters> | undefined;

	let invalid = true;
	$: invalid =
		isNullish(canisters) ||
		isNullish(canisters.ledgerCanisterId) ||
		isNullish(canisters.indexCanisterId);

	const dispatch = createEventDispatcher();

	let snsSegmentId = Symbol();
	let customSegmentId = Symbol();

	let selectedSegmentId = snsSegmentId;

	let filter = '';
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
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
</form>
