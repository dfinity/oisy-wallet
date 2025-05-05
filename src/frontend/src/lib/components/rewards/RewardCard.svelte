<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { REWARDS_BANNER, REWARDS_STATUS_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	interface Props {
		onclick: () => void;
		reward: RewardDescription;
		testId?: string;
	}

	let { onclick, reward, testId }: Props = $props();
</script>

<button {onclick} class="flex flex-col" data-tid={testId}>
	<div class="-mb-7">
		<div class="max-h-66 overflow-hidden rounded-2xl">
			<Img
				src={reward.logo}
				testId={REWARDS_BANNER}
				alt={replacePlaceholders($i18n.rewards.alt.reward_logo, {
					$campaignName: reward.cardTitle
				})}
			/>
		</div>
	</div>

	<div class="relative rounded-lg bg-primary p-4">
		<article class="h-full">
			<section>
				<div
					class="flex flex-col-reverse items-center text-start text-lg font-semibold md:flex-row"
				>
					<div class="mr-auto flex flex-col items-center md:flex-row">
						{reward.cardTitle}
					</div>

					<span class="mr-auto inline-flex md:ml-auto md:mr-0">
						<RewardDateBadge
							date={reward.endDate}
							testId={nonNullish(testId) ? `${testId}-date-badge` : undefined}
						/>
					</span>
				</div>
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
