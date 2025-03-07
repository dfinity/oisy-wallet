<script lang="ts">
	import { airdropCampaigns } from '$env/airdrop-campaigns.env';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import airdropBanner from '$lib/assets/airdrops-banner.svg';
	import AirdropsGroups from '$lib/components/airdrops/AirdropsGroup.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		AIRDROPS_ACTIVE_CAMPAIGNS_CONTAINER,
		AIRDROPS_BANNER,
		AIRDROPS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/airdrops.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let ongoingCampaigns: AirdropDescription[];
	$: ongoingCampaigns = airdropCampaigns.filter(({ startDate, endDate }) =>
		isOngoingCampaign({ startDate, endDate })
	);

	let upcomingCampaigns: AirdropDescription[];
	$: upcomingCampaigns = airdropCampaigns.filter(({ startDate }) => isUpcomingCampaign(startDate));
</script>

<div class="relative mb-6 flex items-end md:mb-10">
	<div class="max-h-66 overflow-hidden rounded-2xl">
		<Img src={airdropBanner} testId={AIRDROPS_BANNER} />
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
