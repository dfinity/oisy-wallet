import type { OnEventCallback } from '$lib/types/event-modifiers';
import type { Snippet } from 'svelte';

export interface ModalProps {
	visible?: boolean;
	role?: 'dialog' | 'alert';
	testId?: string;
	disablePointerEvents?: boolean;
	title?: Snippet;
	/**
	 * An accessible name for a modal that deliberately has no `title`.
	 *
	 * Without a title snippet there is no header, so there is no heading for
	 * `aria-labelledby` to point at and the dialog reaches assistive technology
	 * unnamed. Ignored when `title` is given, since the heading is the better
	 * name and an element must not carry both.
	 */
	ariaLabel?: string;
	headerLeft?: Snippet;
	headerRight?: Snippet;
	subTitle?: Snippet;
	footer?: Snippet;
	children: Snippet;
	onClose?: () => void;
	onIntroEnd?: () => void;
	onClick?: OnEventCallback;
}
