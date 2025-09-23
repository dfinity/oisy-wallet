<script lang="ts">
	import type { Snippet } from 'svelte';
	import Radio from '$lib/components/ui/Radio.svelte';

	interface Props {
		checked: boolean;
		disabled?: boolean;
		onChange: () => void;
		name?: string;
		id?: string;
		label: Snippet;
	}

	const { checked, disabled = false, onChange, id, label }: Props = $props();
</script>

<label
	class="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-brand-subtle-20 bg-brand-subtle-10 p-3"
>
	<Radio {checked} {disabled} {onChange} inputId={id} />
	{@render label()}
</label>
