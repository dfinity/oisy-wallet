import { blockingOverlayOpenStore } from '$lib/stores/ui.store';
import { tick } from 'svelte';

interface OverlayOptions {
	onClose?: () => void;
	returnFocus?: HTMLElement;
	priority?: 'normal' | 'high';
}

// Only the topmost overlay handles keys. A dialog opened from a popover can
// mount before that popover finishes its exit transition.
interface OverlayEntry {
	node: HTMLElement;
	returnTargets: HTMLElement[];
	options: OverlayOptions;
}

const overlays: OverlayEntry[] = [];
// Busy stays visually above dialogs even when they mount after it.
const topmostOverlay = (): OverlayEntry | undefined =>
	overlays.reduce<OverlayEntry | undefined>(
		(topmost, entry) =>
			topmost?.options.priority === 'high' && entry.options.priority !== 'high' ? topmost : entry,
		undefined
	);
const focusableSelector = 'button, a[href], input, select, textarea, iframe, [tabindex]';
// Regions drawn above overlays that must stay reachable while one is open, such as the
// toasts: a persistent notification can be dismissed without closing the dialog.
const reachableSelector = '[data-overlay-reachable]';

const focusableElements = (node: HTMLElement): HTMLElement[] => {
	// Cache shared ancestors for this pass, not across renders: visibility can change
	// while an overlay is open, and long lists otherwise repeat the same style reads.
	const visibility = new Map<HTMLElement, boolean>();
	const isVisible = (element: HTMLElement): boolean => {
		const cached = visibility.get(element);
		if (cached !== undefined) {
			return cached;
		}
		const style = getComputedStyle(element);
		const visible =
			style.display !== 'none' &&
			style.visibility !== 'hidden' &&
			(!element.parentElement || isVisible(element.parentElement));
		visibility.set(element, visible);
		return visible;
	};
	return Array.from(node.querySelectorAll<HTMLElement>(focusableSelector)).filter(
		(element) =>
			element.tabIndex >= 0 &&
			!element.matches(':disabled') &&
			!element.closest('[hidden], [inert]') &&
			isVisible(element)
	);
};

const reachableElements = (): HTMLElement[] =>
	Array.from(document.querySelectorAll<HTMLElement>(reachableSelector)).flatMap(focusableElements);

const isReachable = (target: EventTarget | null): boolean =>
	target instanceof Element && target.closest(reachableSelector) !== null;

/** Svelte action for blocking overlays, including nested dialogs and sheets. */
// Svelte actions receive the node and parameters as positional arguments.
// eslint-disable-next-line local-rules/prefer-object-params
export const overlayFocus = (node: HTMLElement, options: OverlayOptions = {}) => {
	const previous =
		options.returnFocus ??
		(document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
	const parent = topmostOverlay();
	const entry: OverlayEntry = {
		node,
		options,
		returnTargets: previous
			? [previous, ...(parent?.node.contains(previous) ? parent.returnTargets : [])]
			: []
	};
	overlays.push(entry);
	blockingOverlayOpenStore.set(true);
	let mounted = true;

	const isTopmost = () => topmostOverlay() === entry;
	const focusFirst = () => (focusableElements(node)[0] ?? node).focus({ preventScroll: true });

	void tick().then(() => {
		if (mounted && isTopmost() && !node.contains(document.activeElement)) {
			focusFirst();
		}
	});

	const onKeyDown = (event: KeyboardEvent) => {
		// Escape during input-method composition only cancels the composition.
		if (!isTopmost() || event.defaultPrevented || event.isComposing) {
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopImmediatePropagation();
			entry.options.onClose?.();
		}
		if (event.key !== 'Tab') {
			return;
		}
		const own = focusableElements(node);
		const reachable = reachableElements();
		const elements = [...own, ...reachable];
		const [first] = elements;
		const last = elements.at(-1);
		const active = document.activeElement;
		const inScope = active instanceof Node && (node.contains(active) || isReachable(active));
		if (!first || !last) {
			event.preventDefault();
			node.focus();
			return;
		}
		// Within the overlay the browser moves focus itself (iframes included); step in only
		// to wrap, to come back from outside, and to cross between the overlay and the toasts.
		const target = event.shiftKey
			? active === first || !inScope
				? last
				: active === reachable[0]
					? own.at(-1)
					: undefined
			: active === last || !inScope
				? first
				: active === own.at(-1)
					? reachable[0]
					: undefined;
		if (target) {
			event.preventDefault();
			target.focus();
		}
	};

	const onFocusIn = (event: FocusEvent) => {
		if (
			isTopmost() &&
			event.target instanceof Node &&
			!node.contains(event.target) &&
			!isReachable(event.target)
		) {
			focusFirst();
		}
	};
	window.addEventListener('keydown', onKeyDown);
	document.addEventListener('focusin', onFocusIn);

	return {
		update: (options: OverlayOptions) => {
			entry.options = options;
		},
		destroy: () => {
			mounted = false;
			const wasTopmost = isTopmost();
			overlays.splice(overlays.indexOf(entry), 1);
			blockingOverlayOpenStore.set(overlays.length > 0);
			window.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('focusin', onFocusIn);
			const remaining = topmostOverlay()?.node;
			const target = entry.returnTargets.find(
				(element) => element.isConnected && (!remaining || remaining.contains(element))
			);
			if (wasTopmost && target) {
				target.focus({ preventScroll: true });
			} else if (wasTopmost && remaining) {
				(focusableElements(remaining)[0] ?? remaining).focus({ preventScroll: true });
			}
		}
	};
};
