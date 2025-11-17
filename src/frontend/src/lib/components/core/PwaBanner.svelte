<script lang="ts">
	import { Html, IconClose } from '@dfinity/gix-components';
	import InfoBanner from '$lib/components/ui/InfoBanner.svelte';
	import {
		PWA_INFO_BANNER_CLOSE_BUTTON_TEST_ID,
		PWA_INFO_BANNER_TEST_ID
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isPWAStandalone } from '$lib/utils/device.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	let pwaBannerVisible = $state(true);

	const closePwaBanner = () => (pwaBannerVisible = false);
</script>

<!-- TODO remove this WarningBanner again as soon a solution is found for enabling display type standalone  -->
{#if isPWAStandalone() && pwaBannerVisible}
	<div
		class="fixed top-6 left-[50%] z-10 flex min-w-80 -translate-x-[50%] justify-between gap-4 rounded-lg bg-primary"
	>
		<InfoBanner testId={PWA_INFO_BANNER_TEST_ID}>
			<span class="w-full px-2">
				<Html text={replaceOisyPlaceholders($i18n.core.warning.standalone_mode)} />
			</span>
			<button
				aria-label={$i18n.core.text.close}
				data-tid={PWA_INFO_BANNER_CLOSE_BUTTON_TEST_ID}
				onclick={closePwaBanner}
			>
				<IconClose />
			</button>
		</InfoBanner>
	</div>
{/if}
