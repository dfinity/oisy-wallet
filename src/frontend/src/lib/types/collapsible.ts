import type { Snippet } from 'svelte';

export type OnToggle = (params: { expanded: boolean }) => void;

export interface CollapsibleProps {
	id?: string;
	initiallyExpanded?: boolean;
	maxContentHeight?: number;
	testId?: string;
	iconSize?: 'small' | 'medium';
	expandButton?: boolean;
	externalToggle?: boolean;
	wrapHeight?: boolean;
	header?: Snippet;
	trigger?: Snippet<[{ expanded: boolean; toggle: () => void }]>;
	children: Snippet;
	onToggle?: OnToggle;
	expanded?: boolean;
}
