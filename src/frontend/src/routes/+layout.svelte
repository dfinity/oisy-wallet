<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore, type AuthStoreData } from '$lib/stores/auth.store';
	import { onMount } from 'svelte';
	import { initAuthWorker } from '$lib/services/worker.auth.services';
	import { isNullish } from '@dfinity/utils';
	import { loadEthAddress } from '$lib/services/eth.services';

	import 'the-new-css-reset/css/reset.css';
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

	const initEthAddress = async ({ identity }: AuthStoreData) => {
		if (isNullish(identity)) {
			return;
		}

		await loadEthAddress();
	};

	$: (async () => initEthAddress($authStore))();

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
	<slot />
{/await}
