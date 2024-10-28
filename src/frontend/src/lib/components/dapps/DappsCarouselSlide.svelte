<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { type CarouselSlideOisyDappDescription } from '$lib/types/oisyDappDescription';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dappsCarouselSlide: CarouselSlideOisyDappDescription;
	$: ({
		carousel: { text, callToAction },
		logo,
		name
	} = dappsCarouselSlide);
</script>

<div class="flex h-full items-center">
	<div class="mr-4 shrink-0">
		<Img
			height="64"
			width="64"
			rounded
			src={logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppname: name })}
		/>
	</div>
	<div>
		<div class="mb-1">{text}</div>
		<button
			on:click={() => {
				modalStore.openDappDetails(dappsCarouselSlide);
			}}
			aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, { $dAppname: name })}
			class="text-primary text-sm font-semibold"
		>
			{callToAction} →
		</button>
	</div>
</div>
