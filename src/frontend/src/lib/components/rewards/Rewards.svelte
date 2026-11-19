<script lang="ts">
	import { onMount } from 'svelte';
	import AllRewardsList from '$lib/components/rewards/AllRewardsList.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { TRACK_REWARD_LEARN_MORE } from '$lib/constants/analytics.constants';
	import { OISY_REWARDS_URL } from '$lib/constants/oisy.constants';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	onMount(() => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.REWARDS,
				event_value: PLAUSIBLE_EVENT_VALUES.REWARDS_PAGE
			}
		});
	});
</script>

<div class="flex flex-row items-center">
	<PageTitle>{$i18n.rewards.text.title}</PageTitle>

	<ExternalLink
		ariaLabel={$i18n.rewards.text.learn_more}
		href={OISY_REWARDS_URL}
		iconVisible={false}
		styleClass="ml-auto font-semibold"
		trackEvent={{ name: TRACK_REWARD_LEARN_MORE }}
	>
		{$i18n.rewards.text.learn_more}
	</ExternalLink>
</div>

<AllRewardsList />
