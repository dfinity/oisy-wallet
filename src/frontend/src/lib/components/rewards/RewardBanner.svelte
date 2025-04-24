<script lang="ts">
	import rewardBanner from '$lib/assets/reward-modal-banner.svg';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { REWARDS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
</script>

<div class="relative mb-5 flex overflow-hidden rounded-2xl">
	<div class="max-h-60">
		<ImgBanner src={rewardBanner} testId={REWARDS_MODAL_IMAGE_BANNER} styleClass="object-cover" />
	</div>
</div>
