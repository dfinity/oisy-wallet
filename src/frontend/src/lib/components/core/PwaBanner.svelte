<script lang="ts">
	import { Html, IconClose } from '@dfinity/gix-components';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { isPWAStandalone } from '$lib/utils/device.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	let pwaBannerVisible = $state(true);

	const closePwaBanner = () => (pwaBannerVisible = false);
</script>

<!-- TODO remove this WarningBanner again as soon a solution is found for enabling display type standalone  -->
{#if isPWAStandalone() && pwaBannerVisible}
	<div
		class="fixed left-[50%] top-6 z-10 flex min-w-80 -translate-x-[50%] justify-between gap-4 rounded-lg bg-primary"
	>
		<WarningBanner>
			<span class="w-full px-2">
				<Html text={replaceOisyPlaceholders($i18n.core.warning.standalone_mode)} />
			</span>
			<button aria-label={$i18n.core.text.close} onclick={closePwaBanner}>
				<IconClose />
			</button>
		</WarningBanner>
	</div>
{/if}
