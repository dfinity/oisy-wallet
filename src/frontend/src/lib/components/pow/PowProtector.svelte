<script lang="ts">
	import { Modal, themeStore, type ProgressStep } from '@dfinity/gix-components';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import { POW_FEATURE_ENABLED } from '$env/pow.env';
	import type { PowProtectorWorkerInitResult } from '$icp/services/pow-protector-listener';
	import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { ProgressStepsPowProtectorLoader } from '$lib/enums/progress-steps';
	import { errorSignOut } from '$lib/services/auth.services';
	import { hasRequiredCycles } from '$lib/services/loader.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { allowSigningPowStore } from '$lib/stores/pow-protection.store';
	import type { StaticStep } from '$lib/types/steps';
	import type { NonEmptyArray } from '$lib/types/utils';
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

	const MAX_CHECK_ATTEMPTS = 30; // 30 attempts * 5 seconds = 150 seconds total wait time
	const CHECK_INTERVAL_MS = 5000; // 5 seconds

	// Initialize with default value, but it will be reactively updated from the store
	let progressStep = $state(ProgressStepsPowProtectorLoader.REQUEST_CHALLENGE);

	// Subscribe to the store and update progressStep reactively
	$effect(() => {
		const storeData = $allowSigningPowStore;
		if (storeData?.progress) {
			// Use type assertion to ensure the value is treated as a valid enum value
			progressStep = storeData.progress as ProgressStepsPowProtectorLoader;
		}
	});

	// Using $derived for reactive steps array
	let steps = $derived([
		{
			step: ProgressStepsPowProtectorLoader.REQUEST_CHALLENGE,
			text: $i18n.pow_protector.text.request_challenge,
			state: 'in_progress'
		} as ProgressStep,
		{
			step: ProgressStepsPowProtectorLoader.SOLVE_CHALLENGE,
			text: $i18n.pow_protector.text.solve_challenge,
			state: 'in_progress'
		} as ProgressStep,
		{
			step: ProgressStepsPowProtectorLoader.GRANT_CYCLES,
			text: $i18n.pow_protector.text.grant_cycles,
			state: 'in_progress'
		} as ProgressStep
	] as NonEmptyArray<ProgressStep | StaticStep>);

	const checkCycles = async (): Promise<void> => {
		console.warn('checkCycles ', checkAttempts);
		hasCycles = await hasRequiredCycles();
		checkAttempts++;

		if (hasCycles) {
			console.warn('hasCycles');
			if (checkInterval) {
				console.warn('clearInterval');
				clearInterval(checkInterval);
				checkInterval = undefined;
			}
		} else if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
			// Too many failed attempts, sign out
			if (checkInterval) {
				console.warn('clearInterval');
				clearInterval(checkInterval);
				checkInterval = undefined;
			}
			await errorSignOut(get(i18n).init.error.insufficient_cycles_error);
		}
	};

	const initWorker = async (): Promise<void> => {
		if (POW_FEATURE_ENABLED && !powWorker) {
			powWorker = await initPowProtectorWorker();
			powWorker.start();
		}
	};

	onMount(async () => {
		console.warn('onMount');

		// Initial check
		if (POW_FEATURE_ENABLED) {
			hasCycles = await hasRequiredCycles();

			// Always initialize the worker regardless of cycles status
			await initWorker();

			if (!hasCycles) {
				// If the initial check fails, start polling
				checkInterval = setInterval(checkCycles, CHECK_INTERVAL_MS);
			}
		} else {
			// If POW isn't enabled, we still need to render children
			hasCycles = true;
		}
	});

	onDestroy(() => {
		console.warn('onDestroy');

		// Clear interval if component is destroyed
		if (checkInterval) {
			console.warn('clearInterval');
			clearInterval(checkInterval);
			checkInterval = undefined;
		}

		// Stop the worker if it was started
		if (powWorker) {
			powWorker.stop();
		}
	});
</script>

```html
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

				<p class="mt-3">{$i18n.pow_protector.text.description}</p>

				<InProgress {progressStep} {steps} />
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
</style>
