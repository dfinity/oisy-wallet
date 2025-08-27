<script lang="ts">
	import { Modal, type ProgressStep, themeStore } from '@dfinity/gix-components';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import { POW_FEATURE_ENABLED } from '$env/pow.env';
	import type { PowProtectorWorkerInitResult } from '$icp/services/pow-protector-listener';
	import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { ProgressStepsPowProtectorLoader } from '$lib/enums/progress-steps';
	import { errorSignOut } from '$lib/services/auth.services';
	import { handleInsufficientCycles } from '$lib/services/loader.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { powProtectoreProgressStore } from '$lib/stores/pow-protection.store';
	import type { StaticStep } from '$lib/types/steps';
	import type { NonEmptyArray } from '$lib/types/utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	// Use let with $state() for variables that need to be reassigned
	let hasCycles = $state(false);
	let loading = $state(false);
	let checkInterval: ReturnType<typeof setInterval> | undefined;
	let checkAttempts = $state(0);
	let powWorker: PowProtectorWorkerInitResult | undefined;

	const MAX_CHECK_ATTEMPTS = 60;
	const CHECK_INTERVAL_MS = 4000;

	// Initialize with default value, but it will be reactively updated from the store
	let progressStep = $state(ProgressStepsPowProtectorLoader.REQUEST_CHALLENGE);

	// Subscribe to the store and update progressStep reactively
	$effect(() => {
		const progressStoreData = $powProtectoreProgressStore;
		if (progressStoreData?.progress) {
			switch (progressStoreData.progress) {
				case 'REQUEST_CHALLENGE':
					progressStep = ProgressStepsPowProtectorLoader.REQUEST_CHALLENGE;
					break;
				case 'SOLVE_CHALLENGE':
					progressStep = ProgressStepsPowProtectorLoader.SOLVE_CHALLENGE;
					break;
				case 'GRANT_CYCLES':
					progressStep = ProgressStepsPowProtectorLoader.GRANT_CYCLES;
					break;
				default:
					// Fallback to initialization if unknown value
					console.error('Unknown value: ', progressStoreData.progress);
			}
		}
	});

	// Using $derived for reactive steps array
	let steps = $derived([
		{
			step: ProgressStepsPowProtectorLoader.REQUEST_CHALLENGE,
			text: $i18n.pow_protector.text.request_challenge,
			state: 'completed'
		} as ProgressStep,
		{
			step: ProgressStepsPowProtectorLoader.SOLVE_CHALLENGE,
			text: $i18n.pow_protector.text.solve_challenge,
			state: 'completed'
		} as ProgressStep,
		{
			step: ProgressStepsPowProtectorLoader.GRANT_CYCLES,
			text: $i18n.pow_protector.text.grant_cycles,
			state: 'completed'
		} as ProgressStep
	] as NonEmptyArray<ProgressStep | StaticStep>);

	const checkCycles = async (): Promise<void> => {
		hasCycles = await handleInsufficientCycles();
		checkAttempts++;

		if (hasCycles) {
			if (checkInterval) {
				clearInterval(checkInterval);
				checkInterval = undefined;
			}
		} else if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
			// Too many failed attempts, sign out
			if (checkInterval) {
				clearInterval(checkInterval);
				checkInterval = undefined;
			}
			await errorSignOut(get(i18n).init.error.waiting_for_allowed_cycles_aborted);
		}
	};

	const initWorker = async (): Promise<void> => {
		if (!powWorker) {
			powWorker = await initPowProtectorWorker();
			powWorker.start();
		}
	};

	onMount(async () => {
		// Initial check
		if (POW_FEATURE_ENABLED) {
			hasCycles = await handleInsufficientCycles();
			loading = true;

			// Always initialize the worker regardless of cycles status
			await initWorker();

			if (!hasCycles) {
				// If the user does not have the required cycles amount granted, we need to poll until he has
				checkInterval = setInterval(checkCycles, CHECK_INTERVAL_MS);
			}
		}
	});

	onDestroy(() => {
		// Clear interval if component is destroyed
		if (checkInterval) {
			clearInterval(checkInterval);
			checkInterval = undefined;
		}

		// Stop the worker if it was started
		if (powWorker) {
			onDestroy(() => powWorker?.destroy());
		}
	});
</script>

{#if loading}
	{#if hasCycles}
		{@render children?.()}
	{:else}
		<div class="insufficient-cycles-modal">
			<Modal>
				<div class="stretch">
					<div class="banner-container mb-8 block">
						{#await import(`$lib/assets/banner-${$themeStore ?? 'light'}.svg`) then { default: src }}
							<ImgBanner
								alt={replacePlaceholders(replaceOisyPlaceholders($i18n.init.alt.loader_banner), {
									$theme: $themeStore ?? 'light'
								})}
								{src}
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
