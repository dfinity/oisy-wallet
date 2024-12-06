<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { type CarouselSlideOisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dappsCarouselSlide: CarouselSlideOisyDappDescription;
	$: ({
		id: dappId,
		carousel: { text, callToAction },
		logo,
		name: dAppName
	} = dappsCarouselSlide);

	const dispatch = createEventDispatcher();

	const close = () => {
		dispatch('icCloseCarouselSlide', dappId);
	};
</script>

<div class="flex h-full items-center justify-between">
	<div class="mr-4 shrink-0">
		<Img
			height="64"
			width="64"
			rounded
			src={logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dAppName })}
		/>
	</div>
	<div class="w-full justify-start">
		<div class="mb-1">{text}</div>
		<button
			on:click={() => {
				modalStore.openDappDetails(dappsCarouselSlide);
			}}
			aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, { $dAppName: dAppName })}
			class="text-sm font-semibold text-brand-primary"
		>
			{callToAction} →
		</button>
	</div>
	<div class="h-full items-start">
		<button class="p-1 text-tertiary" on:click={close} aria-label={$i18n.core.text.close}>
			<IconClose size="20" />
		</button>
	</div>
</div>
