import type { Snippet } from 'svelte';

export interface InputProps {
	name: string;
	inputType?: 'icp' | 'number' | 'text' | 'currency';
	required?: boolean;
	spellcheck?: boolean;
	step?: number | 'any';
	disabled?: boolean;
	minLength?: number;
	max?: number;
	value?: string | number;
	placeholder: string;
	testId?: string;
	decimals?: number;
	ignore1Password?: boolean;
	inputElement?: HTMLInputElement;
	autofocus?: boolean;
	// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
	autocomplete?: 'off' | 'on';
	// Explicit toggle for the top info row (the `start` / `label` / `end` snippets). Retained from
	// the original gix API so consumers can hide that row even when a label/end snippet is provided.
	showInfo?: boolean;
	onInput?: () => void;
	onBlur?: () => void;
	onFocus?: () => void;
	start?: Snippet;
	label?: Snippet;
	end?: Snippet;
	innerEnd?: Snippet;
	bottom?: Snippet;
}
