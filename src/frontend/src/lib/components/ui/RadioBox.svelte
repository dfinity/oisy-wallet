<script lang="ts">
	import type { Snippet } from 'svelte';
	import Radio from '$lib/components/ui/Radio.svelte';

	interface Props {
		checked: boolean;
		disabled?: boolean;
		styleClass?: string;
		onChange: () => void;
		id?: string;
		label: Snippet;
		description?: Snippet;
	}

	const {
		checked,
		disabled = false,
		styleClass,
		onChange,
		id,
		label,
		description
	}: Props = $props();
</script>

<label
	class={`flex w-full cursor-pointer gap-3 rounded-xl border p-3 transition hover:bg-brand-subtle-20 ${styleClass ?? ''}`}
	class:bg-brand-subtle-10={checked}
	class:bg-secondary={!checked}
	class:border-brand-subtle-20={checked}
	class:border-disabled={!checked}
>
	<Radio {checked} {disabled} inputId={id} {onChange} />

	<span class="flex w-full flex-col">
		{@render label()}

		<span class="mt-4 flex w-full flex-col">
			{@render description?.()}
		</span>
	</span>
</label>
