<script lang="ts">
	import { Modal, Spinner, themeStore } from '@dfinity/gix-components';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import { POW_FEATURE_ENABLED } from '$env/pow.env';
	import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
	import type { PowProtectorWorkerInitResult } from '$icp/types/pow-protector-listener';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { errorSignOut } from '$lib/services/auth.services';
	import { hasRequiredCycles } from '$lib/services/loader.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders, replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	// Use let with $state() for variables that need to be reassigned
	let hasCycles = $state(false);
	let checkInterval: ReturnType<typeof setInterval> | undefined;
	let checkAttempts = $state(0);
	let powWorker: PowProtectorWorkerInitResult | undefined;

	const MAX_CHECK_ATTEMPTS = 5; // 18 attempts * 5 seconds = 90 seconds total wait time
	const CHECK_INTERVAL_MS = 5000; // 5 seconds

	const checkCycles = async (): Promise<void> => {
		console.warn('checkCycles ', checkAttempts);
		hasCycles = await hasRequiredCycles();

		checkAttempts++;

		if (hasCycles) {
			if (checkInterval) {
				console.warn('clearInterval');
				clearInterval(checkInterval);
			}
		} else if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
			// Too many failed attempts, sign out
			if (checkInterval) {
				console.warn('clearInterval');
				clearInterval(checkInterval);
			}
			await errorSignOut(get(i18n).init.error.insufficient_cycles_error);
		}
	};

	onMount(async () => {
		console.warn('onMount');

		// Initial check
		if (POW_FEATURE_ENABLED) {
			const hasSufficentCycles = await hasRequiredCycles();
			if (!hasSufficentCycles) {
				// If initial check fails, start polling
				checkInterval = setInterval(checkCycles, CHECK_INTERVAL_MS);

				// Initialize the worker if we have cycles
				powWorker = await initPowProtectorWorker();
				powWorker.start();
			}
		}
	});

	onDestroy(() => {
		console.warn('onDestroy');

		// Clear interval if component is destroyed
		if (checkInterval) {
			console.warn('clearInterval');
			clearInterval(checkInterval);
		}

		// Stop the worker if it was started
		if (powWorker) {
			powWorker.stop();
		}
	});
</script>

{#if hasCycles}
	{@render children?.()}
{:else}
	<div class="insufficient-cycles-modal">
		<Modal>
			<div class="stretch">
				<div class="banner-container mb-8 block">
					{#await import(`$lib/assets/banner-${$themeStore ?? 'light'}.svg`) then { default: src }}
						<ImgBanner
							{src}
							alt={replacePlaceholders(replaceOisyPlaceholders($i18n.init.alt.loader_banner), {
								$theme: $themeStore ?? 'light'
							})}
							styleClass="aspect-auto"
						/>
					{/await}
				</div>

				<h3 class="my-3">{$i18n.pow_protector.text.title}</h3>

				<div class="spinner-container">
					<Spinner />
				</div>

				<p class="mt-3">{$i18n.pow_protector.text.description}</p>
			</div>
		</Modal>
	</div>
{/if}

<style lang="scss">
	:root:has(.insufficient-cycles-modal) {
		--alert-max-width: 90vw;
		--alert-max-height: initial;
		--dialog-border-radius: calc(var(--border-radius-sm) * 3);
	}

	.banner-container {
		width: 100%;
	}

	.spinner-container {
		display: flex;
		justify-content: center;
		margin: 1rem 0;
	}
</style>
