<script>
	import AllRewardsList from '$lib/components/rewards/AllRewardsList.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { OISY_REWARDS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex flex-row items-center">
	<PageTitle>{$i18n.rewards.text.title}</PageTitle>

	<ExternalLink
		href={OISY_REWARDS_URL}
		ariaLabel={$i18n.rewards.text.learn_more}
		iconVisible={false}
		color="blue"
		styleClass={`ml-auto font-semibold`}
	>
		{$i18n.rewards.text.learn_more}
	</ExternalLink>
</div>

<AllRewardsList />
