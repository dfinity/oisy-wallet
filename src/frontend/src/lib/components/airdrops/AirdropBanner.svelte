<script lang="ts">
	import airdropBanner from '$lib/assets/airdrop-modal-banner.svg';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { AIRDROPS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
</script>

<div class="relative mb-5 flex overflow-hidden rounded-2xl">
	<div class="max-h-60">
		<ImgBanner src={airdropBanner} testId={AIRDROPS_MODAL_IMAGE_BANNER} styleClass="object-cover" />
	</div>
</div>
