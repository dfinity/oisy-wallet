<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { AGREEMENTS_WARNING_BANNER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	let visible = $state(true);

	const close = () => (visible = false);
</script>

{#if visible}
	<WarningBanner testId={AGREEMENTS_WARNING_BANNER}>
		<span class="w-full px-2">{$i18n.core.info.test_banner_beta}</span>
		<button aria-label={$i18n.core.text.close} onclick={close}>
			<IconClose />
		</button>
	</WarningBanner>
{/if}
