<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type HideInfoKey, saveHideInfo, shouldHideInfo } from '$icp/utils/ck.utils';

	export let key: HideInfoKey | undefined;

	let hideInfo = true;
	$: hideInfo = nonNullish(key) ? shouldHideInfo(key) : true;

	const close = () => {
		hideInfo = true;

		if (isNullish(key)) {
			return;
		}

		saveHideInfo(key);
	};
</script>

{#if !hideInfo}
	<div
		class="border-2 border-dust bg-white rounded-lg mb-12 py-4 px-6 relative"
		transition:slide={{ easing: quintOut, axis: 'y' }}
	>
		<button class="text absolute top-2 right-2" on:click={close} aria-label={$i18n.core.text.close}
			><IconClose size="24px" /></button
		>

		<slot />
	</div>
{/if}
