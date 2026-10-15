import {
	MOTION_ENTER,
	MOTION_EXIT,
	MOTION_REDUCED_FADE_DURATION,
	SLIDE_PARAMS
} from '$lib/constants/transition.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import { prefersReducedMotion } from 'svelte/motion';
import {
	blur as svelteBlur,
	fade as svelteFade,
	fly as svelteFly,
	scale as svelteScale,
	slide as svelteSlide,
	type BlurParams,
	type EasingFunction,
	type FadeParams,
	type FlyParams,
	type ScaleParams,
	type SlideParams,
	type TransitionConfig
} from 'svelte/transition';

// Svelte's own transitions with OISY's timings and the system's reduced-motion setting built
// in. Import these instead of `svelte/transition`: a call site that passes no duration gets the
// shared timing, and one that passes its own duration behaves exactly as Svelte's would.

// Re-exported so call sites take the parameter types from here along with the functions.
export type {
	BlurParams,
	EasingFunction,
	FadeParams,
	FlyParams,
	ScaleParams,
	SlideParams,
	TransitionConfig
} from 'svelte/transition';

type RunDirection = 'in' | 'out';

interface TransitionOptions {
	direction?: RunDirection | 'both';
}

// Svelte calls a `transition:` function once with direction 'both'; a returned function is then
// called with the real direction on each run, which is how a bidirectional exit gets its own
// timing. The parameter is optional so svelte-check accepts it as `() => TransitionConfig`.
type TransitionResult =
	TransitionConfig | ((options?: { direction?: RunDirection }) => TransitionConfig);

interface TimingParams {
	delay?: number;
	duration?: number;
	easing?: EasingFunction;
}

const reducedFade = ({
	node,
	params: { delay, duration }
}: {
	node: Element;
	params: TimingParams;
}): TransitionConfig =>
	svelteFade(node, {
		delay,
		// A shorter fade the call site chose (an instant close, say) stays shorter.
		duration: Math.min(duration ?? MOTION_REDUCED_FADE_DURATION, MOTION_REDUCED_FADE_DURATION)
	});

// A height change moves everything below it, so under reduced motion it happens at once.
const reducedInstant = (): TransitionConfig => ({ duration: 0 });

const withSharedTiming =
	<P extends TimingParams>({
		run,
		timing,
		reduced,
		defaults
	}: {
		run: (node: Element, params: P) => TransitionConfig;
		timing: (direction: RunDirection) => TimingParams;
		reduced: (args: { node: Element; params: P }) => TransitionConfig;
		defaults?: Partial<P>;
	}) =>
	// The signature Svelte calls a transition with, so the positional parameters are fixed.
	// eslint-disable-next-line local-rules/prefer-object-params
	(node: Element, params?: P, options?: TransitionOptions): TransitionResult => {
		// Defined keys only: a `duration: undefined` from the caller must not blank the timing.
		const callerParams = Object.fromEntries(
			Object.entries(params ?? {}).filter(([, value]) => value !== undefined)
		) as P;

		const createMoving = (direction: RunDirection): TransitionConfig => {
			const sharedTiming = nonNullish(callerParams.duration) ? {} : timing(direction);

			return run(node, { ...sharedTiming, ...defaults, ...callerParams });
		};

		const createReduced = (): TransitionConfig => reduced({ node, params: callerParams });

		const direction = options?.direction ?? 'both';

		if (direction !== 'both') {
			return prefersReducedMotion.current ? createReduced() : createMoving(direction);
		}

		// Svelte's transitions read the element's computed styles when they are created. A two-way
		// transition that reverses mid-way would read its half-run styles as the new end point and
		// jump, so both forms are created once, from the same starting styles: a reversal changes
		// only the timing, or switches form if the reduced-motion setting changed in between.
		const timingFor = (runDirection: RunDirection): TimingParams => {
			if (nonNullish(callerParams.duration)) {
				return {};
			}

			const { duration, easing } = timing(runDirection);

			return { duration, easing: callerParams.easing ?? easing };
		};

		let created: { moving: TransitionConfig; reduced: TransitionConfig } | undefined;

		return (runOptions?: { direction?: RunDirection }) => {
			const runDirection = runOptions?.direction ?? 'in';

			if (isNullish(created)) {
				created = { moving: createMoving(runDirection), reduced: createReduced() };
			}

			return prefersReducedMotion.current
				? created.reduced
				: { ...created.moving, ...timingFor(runDirection) };
		};
	};

const enterOrExit = (direction: RunDirection): TimingParams =>
	direction === 'out' ? MOTION_EXIT : MOTION_ENTER;

export const fade = withSharedTiming<FadeParams>({
	run: svelteFade,
	timing: enterOrExit,
	reduced: reducedFade
});

export const fly = withSharedTiming<FlyParams>({
	run: svelteFly,
	timing: enterOrExit,
	reduced: reducedFade
});

export const blur = withSharedTiming<BlurParams>({
	run: svelteBlur,
	timing: enterOrExit,
	reduced: reducedFade
});

// Nothing grows from nothing: a scale starts at 96 % unless the call site says otherwise.
export const scale = withSharedTiming<ScaleParams>({
	run: svelteScale,
	timing: enterOrExit,
	reduced: reducedFade,
	defaults: { start: 0.96 }
});

// Height changes keep the slide timing both ways (250 ms), longer than a fade, because the
// content below moves with them.
export const slide = withSharedTiming<SlideParams>({
	run: svelteSlide,
	timing: () => SLIDE_PARAMS,
	reduced: reducedInstant
});
