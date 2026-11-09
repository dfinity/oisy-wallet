import { busy } from '$lib/stores/busy.store';
import { isTopmostOverlay } from '$lib/utils/overlay.utils';
import { tick } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';
import { get } from 'svelte/store';

interface PageSwipeOptions {
	enabled: boolean;
	onBack: () => void;
}

/** Moves only the shared page panel; the actual parent stays live underneath. */
// Svelte action parameters are positional.
// eslint-disable-next-line local-rules/prefer-object-params
export const mobilePageSwipe = (node: HTMLElement, configuration?: PageSwipeOptions) => {
	// Ordinary browser modals and accessory sheets do not install touch handlers.
	if (!configuration) {
		return;
	}
	let options = configuration;
	let gesture:
		| {
				id: number;
				x: number;
				y: number;
				width: number;
				position: number;
				time: number;
				velocity: number;
				dragging: boolean;
		  }
		| undefined;
	let animation: Animation | undefined;
	let disposed = false;
	let leaving = false;
	let suppressClickUntil = 0;
	const allowed = () => options.enabled && !get(busy) && isTopmostOverlay(node) && !leaving;
	const originalTranslate = node.style.translate;
	const reset = () => {
		animation?.cancel();
		animation = undefined;
		gesture = undefined;
		node.style.translate = originalTranslate;
		delete node.dataset.mobilePageDragging;
	};
	const settle = async (commit: boolean) => {
		const current = gesture;
		if (!current) {
			return;
		}
		gesture = undefined;
		const complete = commit && allowed();
		const target = complete ? current.width : 0;
		const next = node.animate(
			[{ translate: `${current.position}px` }, { translate: `${target}px` }],
			{ duration: prefersReducedMotion.current ? 0 : 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
		);
		animation = next;
		node.style.translate = `${target}px`;
		try {
			await next.finished;
		} catch {
			return;
		}
		if (disposed || animation !== next) {
			return;
		}
		if (complete && allowed()) {
			// Same callback as the page's leading Back button. It may open a
			// confirmation instead of closing; never navigate the router directly.
			options.onBack();
			await tick();
		}
		// An exiting page stays offscreen through its existing Svelte outro.
		// A guarded close leaves the form in place, so restore it instead.
		if (!disposed && !leaving) {
			reset();
		}
	};
	const start = (event: TouchEvent) => {
		if (event.touches.length !== 1) {
			reset();
			return;
		}
		const [touch] = event.touches;
		if (!allowed() || animation || touch.clientX < 0 || touch.clientX > 24) {
			return;
		}
		gesture = {
			id: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
			width: node.getBoundingClientRect().width,
			position: 0,
			time: event.timeStamp,
			velocity: 0,
			dragging: false
		};
	};
	const move = (event: TouchEvent) => {
		if (!gesture) {
			return;
		}
		const touch = Array.from(event.touches).find(({ identifier }) => identifier === gesture?.id);
		if (!touch || event.touches.length !== 1 || !allowed() || !event.cancelable) {
			reset();
			return;
		}
		const x = touch.clientX - gesture.x;
		const y = Math.abs(touch.clientY - gesture.y);
		if (!gesture.dragging) {
			if ((y > 8 && y >= x) || x < -8) {
				reset();
				return;
			}
			if (x < 8 || x <= y || gesture.width <= 0) {
				return;
			}
			gesture.dragging = true;
			node.dataset.mobilePageDragging = 'true';
		}
		event.preventDefault();
		const position = Math.max(0, Math.min(x, gesture.width));
		const elapsed = event.timeStamp - gesture.time;
		gesture.velocity = elapsed > 0 && elapsed < 200 ? (position - gesture.position) / elapsed : 0;
		gesture.position = position;
		gesture.time = event.timeStamp;
		node.style.translate = `${position}px`;
	};
	const end = (event: TouchEvent) => {
		if (!gesture?.dragging) {
			reset();
			return;
		}
		suppressClickUntil = performance.now() + 400;
		const progress = gesture.position / gesture.width;
		void settle(
			event.type === 'touchend' &&
				event.touches.length === 0 &&
				(progress > 0.35 ||
					(progress > 0.06 && event.timeStamp - gesture.time < 200 && gesture.velocity > 0.65))
		);
	};
	const click = (event: MouseEvent) => {
		if (performance.now() < suppressClickUntil) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	};
	const outro = () => {
		leaving = true;
	};
	const unsubscribe = busy.subscribe((value) => {
		if (value) {
			reset();
		}
	});
	node.addEventListener('touchstart', start, { passive: true });
	node.addEventListener('touchmove', move, { passive: false });
	node.addEventListener('touchend', end);
	node.addEventListener('touchcancel', end);
	node.addEventListener('click', click, true);
	node.addEventListener('outrostart', outro);
	window.addEventListener('resize', reset);
	document.addEventListener('visibilitychange', reset);
	return {
		update: (next?: PageSwipeOptions) => {
			options = next ?? { ...options, enabled: false };
			if (!allowed()) {
				reset();
			}
		},
		destroy: () => {
			disposed = true;
			reset();
			unsubscribe();
			node.removeEventListener('touchstart', start);
			node.removeEventListener('touchmove', move);
			node.removeEventListener('touchend', end);
			node.removeEventListener('touchcancel', end);
			node.removeEventListener('click', click, true);
			node.removeEventListener('outrostart', outro);
			window.removeEventListener('resize', reset);
			document.removeEventListener('visibilitychange', reset);
		}
	};
};
