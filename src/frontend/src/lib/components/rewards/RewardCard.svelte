<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { REWARDS_BANNER, REWARDS_STATUS_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isEndedCampaign } from '$lib/utils/rewards.utils';

	interface Props {
		onclick: () => void;
		reward: RewardDescription;
		testId?: string | undefined;
	}

	let { onclick, reward, testId = undefined }: Props = $props();

	const hasEnded = $derived(isEndedCampaign(reward.endDate));
</script>

<button {onclick} class="flex flex-col" data-tid={testId}>
	<div class="-mb-7">
		<div class="max-h-66 overflow-hidden rounded-2xl">
			<Img src={reward.logo} testId={REWARDS_BANNER} grayscale={hasEnded} />
		</div>
	</div>

	<div class="relative rounded-lg bg-primary p-4">
		<article class="h-full">
			<section>
				<div class="text-start text-lg font-semibold flex items-center flex-col-reverse md:flex-row">
					<div class="flex items-center mr-auto md:flex-row flex-col">
						<div>
							{reward.cardTitle}
						</div>
						{#if !hasEnded}
							<span class="inline-flex mr-auto md:mx-1">
								<Badge variant="success">
									{$i18n.rewards.text.youre_eligible}
								</Badge>
							</span>
						{/if}
					</div>

					<span class="md:ml-auto mr-auto inline-flex">
						<RewardDateBadge
							date={reward.endDate}
							testId={nonNullish(testId) ? `${testId}-badge` : undefined}
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
