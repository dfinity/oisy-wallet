<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { dirtyWizardState } from '$lib/stores/progressWizardState.store';
	import { beforeNavigate } from '$app/navigation';
	import { i18n } from '$lib/stores/i18n.store';

	beforeNavigate(({ cancel }) => {
		if ($dirtyWizardState) {
			let userConfirmed = window.confirm($i18n.navigation.text.confirm_navigate);
			if (userConfirmed) {
				modalStore.close();
			} else {
				cancel();
			}
		} else {
			modalStore.close();
		}
	});
</script>
