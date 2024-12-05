<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { dirty } from '$lib/stores/dirty.store';
	import { modalStore } from '$lib/stores/modal.store';

	beforeNavigate(({ cancel }) => {
		if ($dirty?.dirty) {
			let userConfirmed = window.confirm('Are you sure you want to navigate away?');
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
