import { isNullish, nonNullish } from '@dfinity/utils';

// One highlight block slides to the hovered or keyboard-focused row, instead of each row fading
// its own background in and out. The block sits inside the row's scroll container, so it scrolls
// with the rows. Its look lives with the host: see the dropdown variant of `Popover`.
const HIGHLIGHT_CLASS = 'sliding-highlight';
const HOST_ATTRIBUTE = 'data-sliding-highlight';
// Marks a list that scrolls on its own inside the host. An attribute rather than a class: Svelte
// rewrites the whole class of an element whose `class` is reactive.
const LIST_ATTRIBUTE = 'data-sliding-highlight-list';

// Rows that are not list items: menu rows, nav items and LogoButtons such as "All networks".
// `Popover.svelte` clears the hover fill of these rows and of the elements that paint it for them.
const ROW_SELECTOR = '.menu-row, .nav-item, button:has(> .logo-button-wrapper)';
const DISABLED_SELECTOR = ':disabled, [aria-disabled="true"], .disabled';
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

// The highlight's fade-out in `Popover.svelte`. Once it has faded, the block is parked at the
// top: left at an old row, it would keep a filtered list's scroll area as long as before.
const FADE_OUT_MS = 100;

const isDisabled = (row: HTMLElement): boolean =>
	row.matches(DISABLED_SELECTOR) ||
	nonNullish(row.querySelector(`:scope > :is(${DISABLED_SELECTOR})`));

// A dialog opened from a row renders inline, inside the host: the language picker in the signed-out
// user menu is a popover, or a modal on phones. Its rows are its own, with its own highlight or
// none, so only elements whose nearest dialog is the host's count here.
const isOwnedBy = ({ node, element }: { node: HTMLElement; element: Element }): boolean =>
	element.closest(DIALOG_SELECTOR) === node.closest(DIALOG_SELECTOR);

const findRow = ({
	node,
	target
}: {
	node: HTMLElement;
	target: EventTarget | null;
}): HTMLElement | undefined => {
	if (!(target instanceof Element)) {
		return;
	}

	// The popover itself may sit inside a list item elsewhere on the page: only rows within it count.
	const within = (element: HTMLElement | null): HTMLElement | undefined =>
		nonNullish(element) &&
		element !== node &&
		node.contains(element) &&
		isOwnedBy({ node, element })
			? element
			: undefined;

	// A list item wins over the button inside it: it is the box whose siblings are the other rows.
	const found =
		within(target.closest<HTMLElement>('li')) ?? within(target.closest<HTMLElement>(ROW_SELECTOR));

	return nonNullish(found) && !isDisabled(found) ? found : undefined;
};

// A wrapper around rows, such as a group with a divider, that the pointer reaches through its
// border or a gap between rows; or a divider between groups, which is such a gap.
const holdsRows = ({ node, target }: { node: HTMLElement; target: EventTarget | null }): boolean =>
	target instanceof Element &&
	isOwnedBy({ node, element: target }) &&
	(target instanceof HTMLHRElement || nonNullish(target.querySelector(`li, ${ROW_SELECTOR}`)));

const scrollContainerOf = ({ node, row }: { node: HTMLElement; row: HTMLElement }): HTMLElement => {
	for (
		let element = row.parentElement;
		nonNullish(element) && element !== node;
		element = element.parentElement
	) {
		const { overflowY } = getComputedStyle(element);

		if (overflowY === 'auto' || overflowY === 'scroll') {
			return element;
		}
	}

	return node;
};

// The row's box in the container's own pixels. Bounding boxes keep fractions, so on a zoomed or
// scaled page the block ends exactly where the row does and never stretches the scroll area by a
// rounded pixel. They are divided by the scale the popover opens with, measured mid-animation.
const boxWithin = ({ row, container }: { row: HTMLElement; container: HTMLElement }) => {
	const containerBox = container.getBoundingClientRect();
	const rowBox = row.getBoundingClientRect();
	const layoutWidth = parseFloat(getComputedStyle(container).width);
	const scale = layoutWidth > 0 && containerBox.width > 0 ? containerBox.width / layoutWidth : 1;

	return {
		x: (rowBox.left - containerBox.left) / scale - container.clientLeft + container.scrollLeft,
		y: (rowBox.top - containerBox.top) / scale - container.clientTop + container.scrollTop,
		width: rowBox.width / scale,
		height: rowBox.height / scale
	};
};

type Box = ReturnType<typeof boxWithin>;

// Half a pixel either way is the same place: a fresh measure of an unmoved row differs only by
// float noise.
const isSameBox = ({ a, b }: { a: Box; b: Box }): boolean =>
	Math.abs(a.x - b.x) < 0.5 &&
	Math.abs(a.y - b.y) < 0.5 &&
	Math.abs(a.width - b.width) < 0.5 &&
	Math.abs(a.height - b.height) < 0.5;

const createHighlight = (container: HTMLElement): HTMLElement => {
	const isList = container instanceof HTMLUListElement || container instanceof HTMLOListElement;
	const highlight = document.createElement(isList ? 'li' : 'span');

	highlight.className = HIGHLIGHT_CLASS;
	highlight.setAttribute('aria-hidden', 'true');

	if (isList) {
		highlight.setAttribute('role', 'presentation');
	}

	return highlight;
};

// Svelte fixes an action's signature as (node, parameter), as for overlayFocus.
// eslint-disable-next-line local-rules/prefer-object-params
export const slidingHighlight = (node: HTMLElement, enabled: boolean) => {
	let highlight: HTMLElement | undefined;
	// The row under a hovering pointer: where the block goes back to when keyboard focus leaves.
	let hoveredRow: HTMLElement | undefined;
	let parkTimer: ReturnType<typeof setTimeout> | undefined;
	const lists = new Set<HTMLElement>();
	// The row the block sits on and the box last written for it. A panel capped by a narrower
	// viewport reflows its rows with no pointer or focus event, so their size is watched.
	let currentRow: HTMLElement | undefined;
	let placed: Box | undefined;
	let resizeObserver: ResizeObserver | undefined;

	const isVisible = (): boolean => highlight?.classList.contains('visible') ?? false;

	const hide = () => {
		if (isNullish(highlight)) {
			return;
		}

		highlight.classList.remove('visible');
		currentRow = undefined;
		resizeObserver?.disconnect();

		clearTimeout(parkTimer);
		parkTimer = setTimeout(() => {
			if (nonNullish(highlight) && !isVisible()) {
				highlight.style.setProperty('--highlight-y', '0px');
				highlight.style.setProperty('--highlight-height', '0px');
				placed = undefined;
			}
		}, FADE_OUT_MS);
	};

	const place = ({ block, box, instant }: { block: HTMLElement; box: Box; instant: boolean }) => {
		block.classList.toggle('instant', instant);
		block.style.setProperty('--highlight-x', `${box.x}px`);
		block.style.setProperty('--highlight-y', `${box.y}px`);
		block.style.setProperty('--highlight-width', `${box.width}px`);
		block.style.setProperty('--highlight-height', `${box.height}px`);
		placed = box;

		if (instant) {
			// Commit the new box before transitions come back on.
			block.getBoundingClientRect();
			block.classList.remove('instant');
		}
	};

	// A resize keeps the block on its row at once, without sliding. Observing a row reports its
	// size straight away; that report changes nothing, so a slide in progress runs on.
	const remeasure = () => {
		const row = currentRow;
		const container = highlight?.parentElement;

		if (
			isNullish(highlight) ||
			isNullish(container) ||
			isNullish(row) ||
			!row.isConnected ||
			!isVisible()
		) {
			return;
		}

		const box = boxWithin({ row, container });

		if (nonNullish(placed) && isSameBox({ a: box, b: placed })) {
			return;
		}

		place({ block: highlight, box, instant: true });
	};

	const watchSize = ({ row, container }: { row: HTMLElement; container: HTMLElement }) => {
		currentRow = row;

		if (typeof ResizeObserver === 'undefined') {
			return;
		}

		resizeObserver ??= new ResizeObserver(remeasure);
		resizeObserver.disconnect();
		resizeObserver.observe(row);
		resizeObserver.observe(container);
	};

	const moveTo = (row: HTMLElement) => {
		const container = scrollContainerOf({ node, row });

		let block = highlight;

		if (block?.parentElement !== container) {
			block?.remove();
			block = createHighlight(container);

			// The host is positioned through its own attribute; a list scrolling inside it needs one too.
			if (container !== node) {
				container.setAttribute(LIST_ATTRIBUTE, '');
				lists.add(container);
			}

			container.prepend(block);
			highlight = block;
		}

		clearTimeout(parkTimer);

		// A block that is not showing appears in place: it only ever slides from one row to the
		// next, never in from wherever it was last hidden.
		place({ block, box: boxWithin({ row, container }), instant: !isVisible() });

		block.classList.add('visible');
		watchSize({ row, container });
	};

	// The pointer left the rows. A keyboard-focused row keeps the block: the highlight clears the
	// row's own focus fill, so hiding would leave it with only its ring.
	const restOrHide = () => {
		const { activeElement } = document;
		const focusedRow =
			activeElement instanceof Element && activeElement.matches(':focus-visible')
				? findRow({ node, target: activeElement })
				: undefined;

		if (nonNullish(focusedRow)) {
			moveTo(focusedRow);
			return;
		}

		hide();
	};

	const onPointerOver = ({ pointerType, target }: PointerEvent) => {
		// Touch has no hover: a tapped row keeps its own pressed fill and nothing slides.
		if (pointerType !== 'mouse' && pointerType !== 'pen') {
			return;
		}

		const row = findRow({ node, target });

		if (nonNullish(row)) {
			hoveredRow = row;
			moveTo(row);
			return;
		}

		// Between rows, the block stays put so it slides on to the next row instead of blinking.
		if (holdsRows({ node, target })) {
			return;
		}

		hoveredRow = undefined;
		restOrHide();
	};

	// A click moves the block to the clicked row: no pointerover follows when the pointer has not
	// moved since it hovered there, and focus from a click does not count as keyboard focus.
	const onPointerDown = ({ pointerType, target }: PointerEvent) => {
		if (pointerType !== 'mouse' && pointerType !== 'pen') {
			return;
		}

		const row = findRow({ node, target });

		if (nonNullish(row)) {
			hoveredRow = row;
			moveTo(row);
		}
	};

	const onPointerLeave = () => {
		hoveredRow = undefined;
		restOrHide();
	};

	// Typing in a search re-renders the list under a mouse that does not move, so no pointer event
	// follows: the block could stay over a row that is gone, keeping the old scroll length. A
	// switch or checkbox fires input too, but its row stays where it is.
	const onInput = ({ target }: Event) => {
		if (
			target instanceof HTMLInputElement &&
			(target.type === 'checkbox' || target.type === 'radio')
		) {
			return;
		}

		hoveredRow = undefined;
		hide();
	};

	const onFocusIn = ({ target }: FocusEvent) => {
		if (!(target instanceof Element) || !target.matches(':focus-visible')) {
			return;
		}

		const row = findRow({ node, target });

		if (nonNullish(row)) {
			moveTo(row);
		}
	};

	// Focus left the rows: back to the row under the pointer, if there is one.
	const onFocusOut = ({ relatedTarget }: FocusEvent) => {
		if (nonNullish(findRow({ node, target: relatedTarget }))) {
			return;
		}

		if (hoveredRow?.isConnected) {
			moveTo(hoveredRow);
			return;
		}

		hide();
	};

	const attach = () => {
		node.setAttribute(HOST_ATTRIBUTE, '');
		node.addEventListener('pointerover', onPointerOver);
		node.addEventListener('pointerdown', onPointerDown);
		node.addEventListener('pointerleave', onPointerLeave);
		node.addEventListener('input', onInput);
		node.addEventListener('focusin', onFocusIn);
		node.addEventListener('focusout', onFocusOut);
	};

	const detach = () => {
		node.removeAttribute(HOST_ATTRIBUTE);
		node.removeEventListener('pointerover', onPointerOver);
		node.removeEventListener('pointerdown', onPointerDown);
		node.removeEventListener('pointerleave', onPointerLeave);
		node.removeEventListener('input', onInput);
		node.removeEventListener('focusin', onFocusIn);
		node.removeEventListener('focusout', onFocusOut);

		clearTimeout(parkTimer);
		resizeObserver?.disconnect();
		resizeObserver = undefined;
		highlight?.remove();
		highlight = undefined;
		hoveredRow = undefined;
		currentRow = undefined;
		placed = undefined;

		lists.forEach((list) => list.removeAttribute(LIST_ATTRIBUTE));
		lists.clear();
	};

	if (enabled) {
		attach();
	}

	return {
		update: (next: boolean) => {
			detach();

			if (next) {
				attach();
			}
		},
		destroy: detach
	};
};
