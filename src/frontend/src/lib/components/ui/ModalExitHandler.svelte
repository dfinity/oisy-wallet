<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { dirtyWizardState } from '$lib/stores/progressWizardState.store';
	import { blockingOverlayOpenStore } from '$lib/stores/ui.store';
	import { doPreNavigation } from '$lib/utils/before-navigate.utils';

	// Mobile sheets own navigation until their own Close/Cancel/Save completes.
	beforeNavigate(({ cancel }) =>
		doPreNavigation({
			cancel,
			busy: $dirtyWizardState,
			blocking: MOBILE_SHELL && $blockingOverlayOpenStore
		})
	);
</script>
