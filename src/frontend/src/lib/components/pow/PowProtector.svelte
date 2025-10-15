<script lang="ts">
	import { Modal, themeStore } from '@dfinity/gix-components';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import { POW_FEATURE_ENABLED } from '$env/pow.env';
	import { PowProtectorWorker } from '$icp/services/worker.pow-protection.services';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { powProtectorSteps } from '$lib/config/pow.config';
	import { POW_CHECK_INTERVAL_MS, POW_MAX_CHECK_ATTEMPTS } from '$lib/constants/pow.constants';
	import { POW_PROTECTOR_MODAL } from '$lib/constants/test-ids.constants';
	import { ProgressStepsPowProtectorLoader } from '$lib/enums/progress-steps';
	import { errorSignOut } from '$lib/services/auth.services';
	import { isCyclesAllowanceSpent } from '$lib/services/loader.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { powProtectoreProgressStore } from '$lib/stores/pow-protection.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	// Use let with $state() for variables that need to be reassigned
	let cyclesAllowanceSpent = $state<boolean>(false);
	let checkInterval = $state<NodeJS.Timeout | undefined>();
	let checkAttempts = $state<number>(0);
	let powWorker = $state<PowProtectorWorker | undefined>();

	// Initialise with the default value, but it will be reactively updated from the store
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
					// Fallback to initialisation if it is an unknown value
					console.error('Unknown value: ', progressStoreData.progress);
			}
		}
	});

	// Using $derived for a reactive steps array from config
	let steps = $derived(powProtectorSteps({ i18n: $i18n }));

	/**
	 * Clears the check interval and resets the attempt counter
	 */
	const stopPolling = (): void => {
		if (checkInterval) {
			clearInterval(checkInterval);
			checkInterval = undefined;
		}
		checkAttempts = 0;
	};

	/**
	 * Starts polling to check if the user has sufficient cycles
	 */
	const startPolling = (): void => {
		checkInterval = setInterval(checkCycles, POW_CHECK_INTERVAL_MS);
	};

	/**
	 * Is periodically checks if the user has sufficient cycles for POW protection.
	 * It will either clear the interval when cycles are enough or sign out the user
	 * if maximum retry attempts are exceeded.
	 */
	const checkCycles = async (): Promise<void> => {
		// Increment attempt counter to track how many times we've checked
		checkAttempts++;

		// Check the current cycles status and update the reactive state
		cyclesAllowanceSpent = await isCyclesAllowanceSpent();

		if (cyclesAllowanceSpent) {
			if (checkAttempts >= POW_MAX_CHECK_ATTEMPTS) {
				// Failure: Too many failed attempts, clean up and sign out user
				stopPolling();
				// Sign out with the appropriate error message about cycle waiting timeout
				await errorSignOut(get(i18n).init.error.waiting_for_allowed_cycles_aborted);
			}
		} else {
			// Success: User now has sufficient cycles, stop polling
			stopPolling();
		}
	};

	const initWorker = async (): Promise<void> => {
		if (!powWorker) {
			try {
				// Run the worker in the background that continuously checks if the user has sufficient cycles and requests/solves
				// a challenge to grant cycles when needed
				powWorker = await PowProtectorWorker.init();
				powWorker.start();
			} catch (error) {
				// Log error but don't crash
				console.error('Failed to initialize POW worker:', error);
			}
		}
	};

	onMount(async () => {
		if (POW_FEATURE_ENABLED) {
			// Always initialise the worker regardless of cycles status
			console.warn('Initializing POW worker');
			await initWorker();

			try {
				// Initial check
				cyclesAllowanceSpent = await isCyclesAllowanceSpent();

				if (cyclesAllowanceSpent) {
					// Count this as the first attempt
					checkAttempts = 1;
					// If the user does not have any cycles' amount granted, we need to poll until he has
					startPolling();
				}
			} catch (error) {
				// Log error but continue (assume no cycles on error)
				console.error('Error checking initial cycles:', error);
				cyclesAllowanceSpent = false;
			}
		}
	});

	onDestroy(() => {
		if (POW_FEATURE_ENABLED) {
			// Clear interval if the component is destroyed
			stopPolling();

			// Stop the worker if it was started
			if (powWorker) {
				powWorker.destroy();
			}
		}
	});
</script>

{#if POW_FEATURE_ENABLED}
	{#if cyclesAllowanceSpent}
		<!--
		User has no more cycles, so we display modal with progress indicator while cycles are being obtained
		This modal will be displayed until either:
		- User obtains sufficient cycles (checkCycles polling succeeds)
		- Maximum retry attempts reached (user gets signed out)
	-->
		<div class="insufficient-cycles-modal">
			<Modal testId={POW_PROTECTOR_MODAL}>
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
	{:else}
		<!-- User has sufficient cycles, render the app content directly -->
		{@render children?.()}
	{/if}
{:else}
	<!-- POW feature is globally disabled, bypass all protection logic and render the app content directly -->
	{@render children?.()}
{/if}

<style lang="scss">
	:root:has(.insufficient-cycles-modal) {
		--alert-max-width: 90vw;
		--alert-max-height: initial;
		--dialog-border-radius: calc(var(--border-radius-sm) * 3);
	}
</style>
