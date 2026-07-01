<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import SelectOption from '$lib/components/ui/SelectOption.svelte';

	interface Props {
		options: { label: string; value: string }[];
		value?: string;
	}

	let { options, value = $bindable() }: Props = $props();

	const changeValue = () => {
		value = options.at(2)?.value;
	};
</script>

<button data-tid="test" onclick={changeValue}>change</button>

<Select name="test" selectedValue={value}>
	{#each options as { label, value } (value)}
		<SelectOption {value}>{label}</SelectOption>
	{/each}
</Select>
