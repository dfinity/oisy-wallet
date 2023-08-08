<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.store';

	const init = async () => await Promise.all([syncAuthStore()]);

	const syncAuthStore = async () => {
		if (!browser) {
			return;
		}

		try {
			await authStore.sync();
		} catch (err: unknown) {
			console.error(err);
		}
	};
</script>

<svelte:window on:storage={syncAuthStore} />

{#await init()}
	Loading...
{:then _}
	<slot />
{/await}
