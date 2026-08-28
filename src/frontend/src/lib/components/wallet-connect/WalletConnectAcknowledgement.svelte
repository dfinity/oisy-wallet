<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';

	interface Props {
		checked: boolean;
		// What the user is stating. Each review supplies its own, because what OISY could not
		// establish differs: the call a transaction makes, the authority a signature grants.
		text: string;
		inputId: string;
		testId: string;
	}

	let { checked = $bindable(), text, inputId, testId }: Props = $props();

	const handleCheckboxChange = () => {
		checked = !checked;
	};
</script>

<label class="my-6 flex gap-4 rounded-xl bg-secondary p-2" for={inputId}>
	<Checkbox {checked} {inputId} onChange={handleCheckboxChange} {testId} />

	<span class="text-sm text-tertiary">
		{text}
	</span>
</label>
