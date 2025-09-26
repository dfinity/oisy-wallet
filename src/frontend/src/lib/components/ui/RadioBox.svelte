<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Radio from '$lib/components/ui/Radio.svelte';

	interface Props {
		checked: boolean;
		disabled?: boolean;
		onChange: () => void;
		id?: string;
		label: string;
		description?: string;
	}

	const { checked, disabled = false, onChange, id, label, description }: Props = $props();
</script>

<label
	class="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-brand-subtle-20 bg-brand-subtle-10 p-3 transition hover:bg-brand-subtle-20"
>
	<Radio {checked} {disabled} inputId={id} {onChange} />
	<span class="flex flex-col items-start text-left">
		<span class="font-bold">{label}</span>
		{#if nonNullish(description)}
			<span class="text-sm text-tertiary">{description}</span>
		{/if}
	</span>
</label>
