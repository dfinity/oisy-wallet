<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { airdropCampaigns } from '$env/airdrop-campaigns.env';
	import type { AirdropDescription } from '$env/types/env-airdrop';
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
	import { isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/airdrops.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let selectedAirdrop: AirdropDescription;
	$: selectedAirdrop = $modalStore?.data as AirdropDescription;

	let ongoingCampaigns: AirdropDescription[];
	$: ongoingCampaigns = airdropCampaigns.filter(({ startDate, endDate }) =>
		isOngoingCampaign({ startDate, endDate })
	);

	let upcomingCampaigns: AirdropDescription[];
	$: upcomingCampaigns = airdropCampaigns.filter(({ startDate }) => isUpcomingCampaign(startDate));
</script>

<div class="mb-6 rounded-2xl md:mb-10 relative flex items-end overflow-hidden">
	<div class="max-h-64">
		<ImgBanner src={airdropBanner} testId={AIRDROPS_BANNER} />
	</div>
</div>

<AirdropsGroups
	title={$i18n.airdrops.text.active_campaigns}
	airdrops={ongoingCampaigns}
	testId={AIRDROPS_ACTIVE_CAMPAIGNS_CONTAINER}
/>

<AirdropsGroups
	title={$i18n.airdrops.text.upcoming_campaigns}
	airdrops={upcomingCampaigns}
	altText={replaceOisyPlaceholders($i18n.airdrops.alt.upcoming_campaigns)}
	testId={AIRDROPS_UPCOMING_CAMPAIGNS_CONTAINER}
/>

{#if $modalAirdropDetails && nonNullish(selectedAirdrop)}
	<AirdropModal airdrop={selectedAirdrop} />
{/if}
