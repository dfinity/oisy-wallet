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
	// When forwarding slots, they always appear as true
	// This is a known issue in Svelte
	// https://github.com/sveltejs/svelte/issues/6059
	// To hack this, we pass a prop to avoid showing info element when not needed
	// Ideally, this would be calculated
	// showInfo = $$slots.label || $$slots.end
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
