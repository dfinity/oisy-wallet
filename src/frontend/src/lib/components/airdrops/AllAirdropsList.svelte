<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
	import AirdropsGroups from '$lib/components/airdrops/AirdropsGroups.svelte';
	import { modalAirdropDetails } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { type AirdropDescription, airdropEvents } from '$lib/types/airdrop-events';

	let selectedAirdrop: AirdropDescription;
	$: selectedAirdrop = $modalStore?.data;

	const isOngoingEvent = (startDate: Date, endDate: Date) => {
		const currentDate = new Date(Date.now());
		let startDiff = startDate.getTime() - currentDate.getTime();
		let endDiff = endDate.getTime() - currentDate.getTime();

		return startDiff <= 0 && endDiff > 0;
	};

	const isUpcomingEvent = (startDate: Date) => {
		const currentDate = new Date(Date.now());
		let startDiff = startDate.getTime() - currentDate.getTime();

		return startDiff > 0;
	};

	let ongoingEvents: AirdropDescription[];
	$: ongoingEvents = airdropEvents.filter((airdrop) => isOngoingEvent(airdrop.startDate, airdrop.endDate));

	let upcomingEvents: AirdropDescription[];
	$: upcomingEvents = airdropEvents.filter((airdrop) => isUpcomingEvent(airdrop.startDate));
</script>

{#if ongoingEvents.length > 0}
	<AirdropsGroups title="Ongoing" airdrops={ongoingEvents} />
{/if}

{#if upcomingEvents.length > 0}
	<AirdropsGroups title="Upcoming" airdrops={upcomingEvents} />
{/if}

{#if $modalAirdropDetails && nonNullish(selectedAirdrop)}
	<AirdropModal airdrop={selectedAirdrop} />
{/if}
