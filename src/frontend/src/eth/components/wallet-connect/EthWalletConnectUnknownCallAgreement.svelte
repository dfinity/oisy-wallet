<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked: boolean;
	}

	let { checked = $bindable() }: Props = $props();

	const inputId = 'eth-wallet-connect-unknown-call-agreement';

	const handleCheckboxChange = () => {
		checked = !checked;
	};
</script>

<!-- `Checkbox` renders its own `<label for>`, so the text is a sibling label rather than a wrapper
     around it: a label inside a label is invalid, and the nesting is what breaks the click that
     assistive technology relies on. Two labels for one input is allowed and is how the swap and
     limit-order confirmations are built. -->
<div class="my-6 flex items-start gap-4 rounded-xl bg-secondary p-2">
	<Checkbox
		{checked}
		{inputId}
		onChange={handleCheckboxChange}
		testId="wallet-connect-unknown-call-agreement"
	/>

	<label class="block text-sm leading-snug text-tertiary" for={inputId}>
		{$i18n.wallet_connect.text.unknown_call_agreement}
	</label>
</div>
