<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type Snippet, onMount, setContext, type Snippet } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getCampaignEligibilities } from '$lib/services/reward.services';
	import {
		initRewardEligibilityContext,
		initRewardEligibilityStore,
		REWARD_ELIGIBILITY_CONTEXT_KEY
	} from '$lib/stores/reward.store';

	interface Props {
		children?: Snippet;
	}
	let { children }: Props = $props();

	const store = initRewardEligibilityStore();
	setContext(REWARD_ELIGIBILITY_CONTEXT_KEY, initRewardEligibilityContext(store));

	const loadEligibilityReport = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const campaignEligibilities = await getCampaignEligibilities({ identity: $authIdentity });
		store.setCampaignEligibilities(campaignEligibilities);
	};

	onMount(loadEligibilityReport);
</script>

{@render children?.()}
