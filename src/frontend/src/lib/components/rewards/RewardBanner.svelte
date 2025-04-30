<script lang="ts">
	import type { RewardDescription } from '$env/types/env-reward';
	import Img from '$lib/components/ui/Img.svelte';
	import { REWARDS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';

	interface Props {
		reward: RewardDescription;
	}

	let { reward }: Props = $props();
</script>

<div class="mb-5 max-h-60 overflow-hidden rounded-2xl">
	<Img src={reward.logo} testId={REWARDS_MODAL_IMAGE_BANNER} />
</div>
