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

<!-- `Checkbox` renders its own `<label for>`, so the text is a sibling label rather than a wrapper
     around it: a label inside a label is invalid, and the nesting is what breaks the click that
     assistive technology relies on. Two labels for one input is allowed and is how the swap and
     limit-order confirmations are already built. -->
<div class="my-6 flex items-start gap-4 rounded-xl bg-secondary p-2">
	<Checkbox {checked} {inputId} onChange={handleCheckboxChange} {testId} />

	<label class="block text-sm leading-snug text-tertiary" for={inputId}>
		{text}
	</label>
</div>
