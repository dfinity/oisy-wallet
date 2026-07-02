import type { OnEventCallback } from '$lib/types/event-modifiers';
import type { Snippet } from 'svelte';

export interface ModalProps {
	visible?: boolean;
	role?: 'dialog' | 'alert';
	testId?: string;
	disablePointerEvents?: boolean;
	title?: Snippet;
	headerLeft?: Snippet;
	headerRight?: Snippet;
	subTitle?: Snippet;
	footer?: Snippet;
	children: Snippet;
	onClose?: () => void;
	onIntroEnd?: () => void;
	onClick?: OnEventCallback;
}
