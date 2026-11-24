<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';

	interface Props {
		label: string;
		checked: boolean;
		disabled?: boolean;
		// Half the consumers render no children and label the input with their own `<label for>`.
		labelOutside?: boolean;
		testId?: string;
		onChange?: () => void;
	}

	let { label, labelOutside = false, ...props }: Props = $props();

	const inputId = 'checkbox-test';
</script>

{#if labelOutside}
	<Checkbox {inputId} {...props} />
	<label for={inputId}>{label}</label>
{:else}
	<Checkbox {inputId} {...props}>
		<span>{label}</span>
	</Checkbox>
{/if}
