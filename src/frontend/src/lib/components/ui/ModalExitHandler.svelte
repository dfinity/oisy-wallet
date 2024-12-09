<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { dirtyWizardState } from '$lib/stores/progressWizardState.store';
</script>

<svelte:window
	on:popstate={() => {
		if (!$dirtyWizardState) {
			modalStore.close();
		}
	}}
/>
