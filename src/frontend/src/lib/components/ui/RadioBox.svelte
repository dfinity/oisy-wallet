<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		selected: boolean;
		disabled?: boolean;
		onChange: () => void;
		name?: string;
		id?: string;
		label: Snippet;
	}

	const { selected, disabled = false, onChange, name, id, label }: Props = $props();
</script>

<label
	class="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-subtle-20 bg-brand-subtle-10 p-3"
>
	<input
		type="radio"
		{name}
		{id}
		onchange={onChange}
		checked={selected}
		{disabled}
		class:selected
	/>
	{@render label()}
</label>

<style lang="scss">
	input[type='radio'] {
		appearance: none;
		margin: 0;
		width: 20px;
		height: 20px;
		border-radius: var(--border-radius-lg);
		cursor: pointer;
		position: relative;
		box-sizing: border-box;
		background: var(--input-background);
		color: var(--color-background-brand-primary);
		border: var(--input-border-size) solid var(--input-border-color);
		transition:
			color var(--animation-time-short) ease-out,
			background var(--animation-time-short) ease-out,
			border var(--animation-time-short) ease-in;

		&:after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--input-background);
		}

		&:checked {
			background: var(--color-background-brand-primary);
			border: var(--input-border-size) solid var(--color-background-brand-primary);
		}

		&:hover {
			border: var(--input-border-size) solid var(--color-background-brand-primary);
		}
	}
</style>
