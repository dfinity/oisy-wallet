<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import airdropBanner from '$lib/assets/airdrops-banner.svg';
	import AirdropModal from '$lib/components/airdrops/AirdropModal.svelte';
	import AirdropsGroups from '$lib/components/airdrops/AirdropsGroup.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import {
		AIRDROPS_ACTIVE_CAMPAIGNS_CONTAINER,
		AIRDROPS_BANNER,
		AIRDROPS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { modalAirdropDetails } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
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

<div class="mb-6 rounded-2xl md:mb-10 relative flex items-end overflow-hidden">
	<div class="max-h-64">
		<ImgBanner src={airdropBanner} testId={AIRDROPS_BANNER} />
	</div>
</div>

<AirdropsGroups
	title={$i18n.airdrops.text.active_campaigns}
	airdrops={ongoingEvents}
	testId={AIRDROPS_ACTIVE_CAMPAIGNS_CONTAINER}
/>

<AirdropsGroups
	title={$i18n.airdrops.text.upcoming_campaigns}
	airdrops={upcomingEvents}
	altText={$i18n.airdrops.alt.upcoming_campaigns}
	testId={AIRDROPS_UPCOMING_CAMPAIGNS_CONTAINER}
/>

{#if $modalAirdropDetails && nonNullish(selectedAirdrop)}
	<AirdropModal airdrop={selectedAirdrop} />
{/if}
