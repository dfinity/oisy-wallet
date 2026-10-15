import { tick } from 'svelte';

interface OverlayOptions {
	onClose?: () => void;
	returnFocus?: HTMLElement;
}

// Only the topmost overlay handles keys. A dialog opened from a popover can
// mount before that popover finishes its exit transition.
interface OverlayEntry {
	node: HTMLElement;
	returnTargets: HTMLElement[];
}

const overlays: OverlayEntry[] = [];
const focusableSelector = 'button, a[href], input, select, textarea, iframe, [tabindex]';

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

/** Svelte action for blocking overlays, including nested dialogs and sheets. */
// Svelte actions receive the node and parameters as positional arguments.
// eslint-disable-next-line local-rules/prefer-object-params
export const overlayFocus = (node: HTMLElement, options: OverlayOptions = {}) => {
	let current = options;
	const previous =
		options.returnFocus ??
		(document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
	const parent = overlays.at(-1);
	const entry: OverlayEntry = {
		node,
		returnTargets: previous
			? [previous, ...(parent?.node.contains(previous) ? parent.returnTargets : [])]
			: []
	};
	overlays.push(entry);
	let mounted = true;

	const isTopmost = () => overlays.at(-1) === entry;
	const focusFirst = () => (focusableElements(node)[0] ?? node).focus({ preventScroll: true });

	void tick().then(() => {
		if (mounted && isTopmost() && !node.contains(document.activeElement)) {
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
			overlays.splice(overlays.indexOf(entry), 1);
			window.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('focusin', onFocusIn);
			const remaining = overlays.at(-1)?.node;
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
