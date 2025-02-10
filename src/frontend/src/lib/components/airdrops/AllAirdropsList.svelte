<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
	import AirdropsGroups from '$lib/components/airdrops/AirdropsGroups.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { modalAirdropDetails } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { type AirdropDescription, airdropEvents } from '$lib/types/airdrop-events';

	let selectedAirdrop: AirdropDescription;
	$: selectedAirdrop = $modalStore?.data as AirdropDescription;

	const isOngoingEvent = ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
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
	$: ongoingEvents = airdropEvents.filter((airdrop) =>
		isOngoingEvent({ startDate: airdrop.startDate, endDate: airdrop.endDate })
	);

	let upcomingEvents: AirdropDescription[];
	$: upcomingEvents = airdropEvents.filter((airdrop) => isUpcomingEvent(airdrop.startDate));
</script>

<div class="mb-6 md:mb-10">
	<article class="relative flex items-end overflow-hidden rounded-2xl">
		<div class="max-h-64">
			<ImgBanner src={'/images/dapps/kong-swap.webp'} />
		</div>
	</article>
</div>

{#if ongoingEvents.length > 0}
	<AirdropsGroups title="Active campaigns" airdrops={ongoingEvents} />
{/if}

<AirdropsGroups
	title="Upcoming campaigns"
	airdrops={upcomingEvents}
	altText="Stay tuned for the upcoming airdrops - subscribe to OISY on X and follow recent updates."
/>

{#if $modalAirdropDetails && nonNullish(selectedAirdrop)}
	<AirdropModal airdrop={selectedAirdrop} />
{/if}
