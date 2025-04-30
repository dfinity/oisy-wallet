<script lang="ts">
	import {REWARDS_MODAL_IMAGE_BANNER} from '$lib/constants/test-ids.constants';
	import type {RewardDescription} from "$env/types/env-reward";
	import Img from "$lib/components/ui/Img.svelte";

	interface Props {
		reward: RewardDescription;
	}

	let { reward }: Props = $props();
</script>

<div class="max-h-60 overflow-hidden rounded-2xl mb-5">
	<Img src={reward.logo} testId={REWARDS_MODAL_IMAGE_BANNER} />
</div>
