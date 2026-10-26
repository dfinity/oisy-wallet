<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import Logo from '$lib/components/ui/Logo.svelte';
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
	import type { SwapProviderPool } from '$lib/providers/swap-provider-pool.providers';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SwapProvider } from '$lib/types/swap';
	import { resolveText } from '$lib/utils/i18n.utils';
	import { findSwapProvider } from '$lib/utils/swap.utils';

	interface Props {
		providers: SwapProvider[];
		// Shown after the asked providers while a quote loads, so the scroll shows OISY's range.
		pool?: SwapProviderPool;
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
		// The first provider of a comparison fades up into the empty slot instead of turning in.
		fadingIn: boolean;
		node?: HTMLElement;
		stack?: HTMLElement;
		sharp?: HTMLElement;
		soft?: HTMLElement;
	}

	let {
		providers,
		pool,
		loading,
		selectedProvider,
		confirmationId,
		animate = true
	}: Props = $props();
	let displayedProvider = $state<SwapProvider>();
	let layers = $state<ProviderLayer[]>([]);
	let revision = $state(0);
	let current = $derived(layers.find((layer) => layer.provider === displayedProvider));
	let lastConfirmationId: Props['confirmationId'];
	let animations: Animation[] = [];
	// A fade-up runs once. Re-runs for a reveal or a confirmation leave it going; only a turn,
	// which samples the layer's pose first, cuts it short.
	let fades: Animation[] = [];

	const cancelAnimations = () => {
		animations.forEach((animation) => animation.cancel());
		animations = [];
	};

	const cancelFades = () => {
		fades.forEach((animation) => animation.cancel());
		fades = [];
	};

	onDestroy(cancelFades);

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
			const fadingIn = animate && loading && layers.length === 0;
			const reduced = prefersReducedMotion.current;
			const moving = entering && !reduced;
			const softening = (entering || fadingIn) && !reduced;
			const layer: ProviderLayer = {
				provider: next,
				details,
				pose: {
					transform: moving
						? 'translateY(75%) rotateX(90deg)'
						: fadingIn && !reduced
							? 'translateY(4px)'
							: 'none',
					opacity: entering || fadingIn ? '0' : '1'
				},
				sharpOpacity: softening ? '0' : '1',
				softOpacity: softening ? '1' : '0',
				stackPose: 'none',
				fadingIn
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
		fade = false,
		onfinish
	}: {
		node?: HTMLElement;
		keyframes: Keyframe[];
		duration?: number;
		easing?: string;
		fade?: boolean;
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
			if (fade) {
				fades = fades.filter((item) => item !== animation);
			} else {
				animations = animations.filter((item) => item !== animation);
			}
			onfinish?.();
		};
		(fade ? fades : animations).push(animation);
	};

	// The last round's participants. A new round starts with none of its own, so until they
	// report (the debounce, slow eligibility checks) the scroll keeps turning through these
	// instead of holding one name.
	let previousCandidates: SwapProvider[] = [];
	// One boolean, so prop updates that leave it unchanged never restart the clock mid-turn.
	let clockRunning = $derived(
		loading && animate && !prefersReducedMotion.current && nonNullish(displayedProvider)
	);

	$effect(() => {
		const candidates = providers;
		const pending = loading;
		const selected = pending ? undefined : selectedProvider;
		const turning = animate && !prefersReducedMotion.current;

		untrack(() => {
			if (!pending) {
				showProvider(selected);
				return;
			}
			if (candidates.length > 0) {
				previousCandidates = candidates;
			}

			// No placeholder: a first round leaves the slot empty until its first participant
			// fades in; later rounds keep what is on screen.
			if (isNullish(displayedProvider)) {
				if (nonNullish(candidates[0])) {
					showProvider(candidates[0]);
				}
				return;
			}

			// A shown provider the new round leaves out gives way at the next turn, so the rhythm
			// holds. Without a running scroll it gives way at once.
			if (!turning && candidates.length > 0 && !candidates.includes(displayedProvider)) {
				showProvider(candidates[0]);
			}
		});
	});

	// The asked providers first, then the related and the wider pool, each once per pass. Only
	// asked providers can be on screen first (the clock starts with one), and the reveal always
	// lands on the real winner, so the pool only ever fills the wait.
	const scrollList = (asked: SwapProvider[]): SwapProvider[] => [
		...asked,
		...[...(pool?.related ?? []), ...(pool?.wider ?? [])].filter(
			(provider) => !asked.includes(provider)
		)
	];

	// One turn clock for the whole comparison, started once a name is on screen so the first one
	// gets a full turn. New rounds and late participants change what the next turn shows, never
	// when it comes.
	$effect(() => {
		if (!clockRunning) {
			return;
		}

		const timer = setInterval(() => {
			untrack(() => {
				const list = scrollList(providers.length > 0 ? providers : previousCandidates);
				const index = list.findIndex((candidate) => candidate === displayedProvider);
				if (list.length > 1 || (list.length === 1 && index === -1)) {
					showProvider(list[(index + 1) % list.length]);
				}
			});
		}, SWAP_PROVIDER_CYCLE_INTERVAL_MS);
		return () => clearInterval(timer);
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

				const turning = layers.length > 1;
				if (turning) {
					cancelFades();
				}
				const moving = turning ? layers : layers.filter(({ fadingIn }) => fadingIn);
				if (moving.length > 0) {
					const turnEasing =
						!reduced &&
						typeof CSS !== 'undefined' &&
						typeof CSS.supports === 'function' &&
						CSS.supports('animation-timing-function', SWAP_PROVIDER_TURN_EASING)
							? SWAP_PROVIDER_TURN_EASING
							: MOTION_EASE_OUT_CSS;
					// A fade-up into an empty slot settles with ease-out; the spring is for turns.
					const fade = !turning;
					const easing = fade ? MOTION_EASE_OUT_CSS : turnEasing;
					for (const layer of moving) {
						layer.fadingIn = false;
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
							easing,
							fade,
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
								easing,
								fade
							});
							play({
								node: layer.soft,
								keyframes: [{ opacity: layer.softOpacity }, { opacity: incoming ? 0 : 1 }],
								duration,
								easing,
								fade
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
	<!-- Plain text for the header's accessible name; `SwapProvider` announces the change. -->
	<div class="provider-loop" data-provider={displayedProvider} data-tid={SWAP_PROVIDER_ANIMATION}>
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
