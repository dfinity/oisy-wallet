<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import Logo from '$lib/components/ui/Logo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		SWAP_PROVIDER_CONFIRMATION_MOTION,
		SWAP_PROVIDER_CYCLE_INTERVAL_MS,
		SWAP_PROVIDER_TURN_EASING
	} from '$lib/constants/swap.constants';
	import { SWAP_PROVIDER_ANIMATION } from '$lib/constants/test-ids.constants';
	import {
		MOTION_EASE_OUT_CSS,
		MOTION_ENTER,
		MOTION_EXIT,
		MOTION_REDUCED_FADE_DURATION
	} from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SwapProvider } from '$lib/types/swap';
	import { resolveText } from '$lib/utils/i18n.utils';
	import { findSwapProvider } from '$lib/utils/swap.utils';

	interface Props {
		providers: SwapProvider[];
		loading: boolean;
		selectedProvider?: SwapProvider;
		confirmationId?: number;
		animate?: boolean;
	}

	type ProviderDetails = NonNullable<ReturnType<typeof findSwapProvider>>;

	interface ProviderLayer {
		provider: SwapProvider;
		details: ProviderDetails;
		pose: Keyframe;
		sharpOpacity: string;
		softOpacity: string;
		stackPose: string;
		node?: HTMLElement;
		stack?: HTMLElement;
		sharp?: HTMLElement;
		soft?: HTMLElement;
	}

	let { providers, loading, selectedProvider, confirmationId, animate = true }: Props = $props();
	let displayedProvider = $state<SwapProvider>();
	let layers = $state<ProviderLayer[]>([]);
	let revision = $state(0);
	let current = $derived(layers.find((layer) => layer.provider === displayedProvider));
	let lastConfirmationId: Props['confirmationId'];
	let animations: Animation[] = [];

	const cancelAnimations = () => {
		animations.forEach((animation) => animation.cancel());
		animations = [];
	};

	const snapshotLayer = (layer: ProviderLayer) => {
		if (!layer.node) {
			return;
		}
		const style = getComputedStyle(layer.node);
		layer.pose = { transform: style.transform, opacity: style.opacity };
		layer.sharpOpacity = layer.sharp ? getComputedStyle(layer.sharp).opacity : '1';
		layer.softOpacity = layer.soft ? getComputedStyle(layer.soft).opacity : '0';
		layer.stackPose = layer.stack ? getComputedStyle(layer.stack).transform : 'none';
	};

	const showProvider = (next?: SwapProvider) => {
		// Preserve every visible identity, including an outgoing provider that becomes the winner.
		// Sample only at a state change; WAAPI owns the frames between changes.
		layers.forEach(snapshotLayer);

		if (!next) {
			if (displayedProvider || layers.length > 0) {
				revision += 1;
			}
			displayedProvider = undefined;
			layers = [];
			return;
		}

		if (!layers.some((layer) => layer.provider === next)) {
			const details = findSwapProvider(next);
			if (!details) {
				return;
			}
			const entering = animate && layers.length > 0;
			const moving = entering && !prefersReducedMotion.current;
			const layer: ProviderLayer = {
				provider: next,
				details,
				pose: {
					transform: moving ? 'translateY(75%) rotateX(90deg)' : 'none',
					opacity: entering ? '0' : '1'
				},
				sharpOpacity: moving ? '0' : '1',
				softOpacity: moving ? '1' : '0',
				stackPose: 'none'
			};
			layers = [...layers, layer];
		}

		if (!animate) {
			layers = layers.filter((layer) => layer.provider === next);
		}
		if (next !== displayedProvider) {
			revision += 1;
		}
		displayedProvider = next;
	};

	const play = ({
		node,
		keyframes,
		duration,
		easing = MOTION_EASE_OUT_CSS,
		onfinish
	}: {
		node?: HTMLElement;
		keyframes: Keyframe[];
		duration?: number;
		easing?: string;
		onfinish?: () => void;
	}) => {
		if (!node) {
			return;
		}
		const animation = node.animate(keyframes, {
			duration,
			easing,
			fill: 'both'
		});
		animation.onfinish = () => {
			animation.cancel();
			animations = animations.filter((item) => item !== animation);
			onfinish?.();
		};
		animations.push(animation);
	};

	$effect(() => {
		const candidates = providers;
		const pending = loading;
		const selected = pending ? undefined : selectedProvider;
		const reduced = prefersReducedMotion.current;
		const enabled = animate;

		return untrack(() => {
			if (!pending) {
				showProvider(selected);
				return;
			}

			showProvider(
				displayedProvider && candidates.includes(displayedProvider)
					? displayedProvider
					: candidates[0]
			);
			if (reduced || !enabled || candidates.length < 2) {
				return;
			}

			const timer = setInterval(() => {
				const index = candidates.findIndex((candidate) => candidate === displayedProvider);
				showProvider(candidates[(index + 1) % candidates.length]);
			}, SWAP_PROVIDER_CYCLE_INTERVAL_MS);
			return () => clearInterval(timer);
		});
	});

	$effect(() => {
		const currentRevision = revision;
		const reduced = prefersReducedMotion.current;
		const enabled = animate;
		const confirmation = confirmationId;
		const pending = loading;
		const selected = pending ? undefined : selectedProvider;
		let cancelled = false;

		// New keyed layers must be bound before starting their animations, not one frame later.
		void tick().then(() => {
			if (cancelled) {
				return;
			}
			untrack(() => {
				cancelAnimations();
				if (!enabled) {
					if (confirmation !== undefined) {
						lastConfirmationId = confirmation;
					}
					return;
				}

				if (layers.length > 1) {
					const turnEasing =
						!reduced &&
						typeof CSS !== 'undefined' &&
						typeof CSS.supports === 'function' &&
						CSS.supports('animation-timing-function', SWAP_PROVIDER_TURN_EASING)
							? SWAP_PROVIDER_TURN_EASING
							: MOTION_EASE_OUT_CSS;
					for (const layer of layers) {
						const incoming = layer.provider === displayedProvider;
						const duration = reduced
							? MOTION_REDUCED_FADE_DURATION
							: incoming
								? MOTION_ENTER.duration
								: MOTION_EXIT.duration;
						play({
							node: layer.node,
							keyframes: reduced
								? [{ opacity: layer.pose.opacity }, { opacity: incoming ? 1 : 0 }]
								: [
										layer.pose,
										{
											transform: incoming
												? 'translateY(0) rotateX(0deg)'
												: 'translateY(-75%) rotateX(-90deg)',
											opacity: incoming ? 1 : 0
										}
									],
							duration,
							easing: turnEasing,
							onfinish: () => {
								if (
									!cancelled &&
									currentRevision === revision &&
									layer.provider !== displayedProvider
								) {
									layers = layers.filter((item) => item !== layer);
								}
							}
						});

						if (!reduced) {
							// Static 2px blur + opacity bridge: the filter itself never animates.
							play({
								node: layer.sharp,
								keyframes: [{ opacity: layer.sharpOpacity }, { opacity: incoming ? 1 : 0 }],
								duration,
								easing: turnEasing
							});
							play({
								node: layer.soft,
								keyframes: [{ opacity: layer.softOpacity }, { opacity: incoming ? 0 : 1 }],
								duration,
								easing: turnEasing
							});
						}
					}
				}

				if (
					!pending &&
					selected &&
					confirmation !== undefined &&
					confirmation !== lastConfirmationId
				) {
					lastConfirmationId = confirmation;
					if (reduced || !current) {
						return;
					}
					play({
						node: current.stack,
						keyframes: [
							{ ...SWAP_PROVIDER_CONFIRMATION_MOTION.keyframes[0], transform: current.stackPose },
							...SWAP_PROVIDER_CONFIRMATION_MOTION.keyframes.slice(1)
						],
						duration: SWAP_PROVIDER_CONFIRMATION_MOTION.duration,
						easing: SWAP_PROVIDER_CONFIRMATION_MOTION.easing
					});
				}
			});
		});

		return () => {
			cancelled = true;
			cancelAnimations();
		};
	});
</script>

{#snippet providerContent(details: ProviderDetails)}
	<Logo alt="" animateReadiness={false} loading="eager" size="xxs" src={details.logo} />
	<span class="min-w-0 truncate text-lg font-bold"
		>{resolveText({ i18n: $i18n, path: details.name })}</span
	>
{/snippet}

{#if current ?? loading}
	<div
		class="provider-loop"
		aria-live="polite"
		data-provider={displayedProvider}
		data-tid={SWAP_PROVIDER_ANIMATION}
		role="status"
	>
		<span class="sr-only"
			>{!loading && current ? resolveText({ i18n: $i18n, path: current.details.name }) : ''}</span
		>
		{#each layers as layer (layer.provider)}
			<div
				bind:this={layer.node}
				class="provider-layer"
				class:outgoing={layer.provider !== displayedProvider}
				aria-hidden="true"
				data-provider={layer.provider}
				data-provider-layer={layer.provider === displayedProvider ? 'current' : 'outgoing'}
			>
				<div bind:this={layer.stack} class="provider-stack">
					<div bind:this={layer.sharp} class="provider-content"
						>{@render providerContent(layer.details)}</div
					>
					<div bind:this={layer.soft} class="provider-content soft"
						>{@render providerContent(layer.details)}</div
					>
				</div>
			</div>
		{/each}
		{#if !current}<div class="w-28 self-center"><SkeletonText /></div>{/if}
	</div>
{/if}

<style lang="scss">
	.provider-loop {
		display: inline-grid;
		max-width: 100%;
		min-width: 0;
		height: 2rem;
		overflow-y: clip;
		vertical-align: middle;
		perspective: 25rem;
		perspective-origin: right center;
	}

	.provider-layer {
		display: grid;
		grid-area: 1 / 1;
		justify-self: end;
		max-width: 100%;
		min-width: 0;
		align-items: center;
		transform-origin: right center;
	}

	.provider-stack {
		display: grid;
		min-width: 0;
		transform-origin: right center;
	}

	.provider-content {
		display: flex;
		grid-area: 1 / 1;
		min-width: 0;
		align-items: center;
		justify-content: end;
		gap: 0.5rem;
		white-space: nowrap;
	}

	.outgoing,
	.soft {
		opacity: 0;
	}
	.soft {
		filter: blur(2px);
	}
	@media (prefers-reduced-motion: reduce) {
		.soft {
			display: none;
		}
	}
</style>
