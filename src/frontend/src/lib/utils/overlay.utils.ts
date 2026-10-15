import { tick } from 'svelte';

interface OverlayOptions {
	onClose?: () => void;
	returnFocus?: HTMLElement;
}

// Only the topmost overlay handles keys. A dialog opened from a popover can
// mount before that popover finishes its exit transition.
const overlays: HTMLElement[] = [];
const focusableSelector = 'button, a[href], input, select, textarea, [tabindex]';

const focusableElements = (node: HTMLElement): HTMLElement[] =>
	Array.from(node.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
		if (
			element.tabIndex < 0 ||
			element.matches(':disabled') ||
			element.closest('[hidden], [inert]')
		) {
			return false;
		}
		for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
			const style = getComputedStyle(parent);
			if (style.display === 'none' || style.visibility === 'hidden') {
				return false;
			}
		}
		return true;
	});

/** Svelte action for blocking overlays, including nested dialogs and sheets. */
// Svelte actions receive the node and parameters as positional arguments.
// eslint-disable-next-line local-rules/prefer-object-params
export const overlayFocus = (node: HTMLElement, options: OverlayOptions = {}) => {
	let current = options;
	const previous =
		options.returnFocus ??
		(document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
	overlays.push(node);
	let mounted = true;

	const isTopmost = () => overlays.at(-1) === node;
	const focusFirst = () => (focusableElements(node)[0] ?? node).focus({ preventScroll: true });

	void tick().then(() => {
		if (mounted && isTopmost()) {
			focusFirst();
		}
	});

	const onKeyDown = (event: KeyboardEvent) => {
		if (!isTopmost() || event.defaultPrevented) {
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopImmediatePropagation();
			current.onClose?.();
		}
		if (event.key !== 'Tab') {
			return;
		}
		const elements = focusableElements(node);
		const [first] = elements;
		const last = elements.at(-1);
		if (!first || !last) {
			event.preventDefault();
			node.focus();
		} else if (
			event.shiftKey &&
			(document.activeElement === first || !node.contains(document.activeElement))
		) {
			event.preventDefault();
			last.focus();
		} else if (
			!event.shiftKey &&
			(document.activeElement === last || !node.contains(document.activeElement))
		) {
			event.preventDefault();
			first.focus();
		}
	};

	const onFocusIn = (event: FocusEvent) => {
		if (isTopmost() && event.target instanceof Node && !node.contains(event.target)) {
			focusFirst();
		}
	};
	window.addEventListener('keydown', onKeyDown);
	document.addEventListener('focusin', onFocusIn);

	return {
		update: (options: OverlayOptions) => {
			current = options;
		},
		destroy: () => {
			mounted = false;
			const wasTopmost = isTopmost();
			overlays.splice(overlays.indexOf(node), 1);
			window.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('focusin', onFocusIn);
			const remaining = overlays.at(-1);
			if (wasTopmost && previous?.isConnected && (!remaining || remaining.contains(previous))) {
				previous.focus({ preventScroll: true });
			} else if (wasTopmost && remaining) {
				(focusableElements(remaining)[0] ?? remaining).focus({ preventScroll: true });
			}
		}
	};
};
