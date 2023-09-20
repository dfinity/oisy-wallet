<script lang="ts">
	import { onMount } from 'svelte';
	import { isAirdropManager } from '$lib/api/airdrop.api';
	import { toastsError } from '$lib/stores/toasts.store';

	let manager = false;

	onMount(async () => {
		try {
			manager = await isAirdropManager();
		} catch (err: unknown) {
			toastsError({
				msg: 'Cannot fetch the manager status of the user.',
				err
			});
		}
	});
</script>

{#if manager}
	<slot />
{/if}
