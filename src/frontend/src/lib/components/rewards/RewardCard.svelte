<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { REWARDS_BANNER, REWARDS_STATUS_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		reward: RewardDescription;
		testId?: string | undefined;
	}

	let { onclick, reward, testId = undefined }: Props = $props();
</script>

<button {onclick} class="flex flex-col" data-tid={testId}>
	<div class="-mb-7">
		<div class="max-h-66 overflow-hidden rounded-2xl">
			<Img src={reward.logo} testId={REWARDS_BANNER} />
		</div>
	</div>

	<div class="relative rounded-lg bg-primary p-4">
		<span class="absolute right-4 top-4">
			<RewardDateBadge
				date={reward.endDate}
				testId={nonNullish(testId) ? `${testId}-badge` : undefined}
			/>
		</span>
		<article class="h-full">
			<section>
				<p class="m-0 text-start text-lg font-semibold">{reward.cardTitle}</p>

				<p class="m-0 mt-2 text-start text-xs text-tertiary">
					<Html text={reward.oneLiner} />
				</p>
			</section>
			<section class="bottom-4 left-4 mt-3 flex">
				<div
					data-tid={REWARDS_STATUS_BUTTON}
					class="rounded-xl bg-brand-primary px-4 py-3 font-bold text-primary-inverted"
					>{$i18n.rewards.text.check_status}
				</div>
			</section>
		</article>
	</div>
</button>
