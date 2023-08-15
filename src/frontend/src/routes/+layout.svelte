<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore, type AuthStoreData } from '$lib/stores/auth.store';
	import { onMount } from 'svelte';
	import { initAuthWorker } from '$lib/services/worker.auth.services';
	import { isNullish } from '@dfinity/utils';
	import { loadAddress } from '$lib/services/address.services';
	import Header from '$lib/components/layout/Header.svelte';

	import '$lib/styles/global.scss';

	/**
	 * Init authentication
	 */

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

	/**
	 * Init eth address
	 */

	const initAddress = async ({ identity }: AuthStoreData) => {
		if (isNullish(identity)) {
			return;
		}

		await loadAddress();
	};

	$: (async () => initAddress($authStore))();

	/**
	 * Workers
	 */

	let worker: { syncAuthIdle: (auth: AuthStoreData) => void } | undefined;

	onMount(async () => (worker = await initAuthWorker()));

	$: worker, $authStore, (() => worker?.syncAuthIdle($authStore))();
</script>

<svelte:window on:storage={syncAuthStore} />

{#await init()}
	Loading...
{:then _}
	<Header />

	<main>
		<slot />
	</main>
{/await}
