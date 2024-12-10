<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { dirtyWizardState } from '$lib/stores/progressWizardState.store';
	import { doPreNavigation } from '$lib/utils/before-navigate.utils';

	beforeNavigate(({ cancel }) => doPreNavigation({ cancel, busy: $dirtyWizardState }));
</script>
