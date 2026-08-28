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

<label class="my-6 flex gap-4 rounded-xl bg-secondary p-2" for={inputId}>
	<Checkbox
		{checked}
		{inputId}
		onChange={handleCheckboxChange}
		testId="wallet-connect-unknown-call-agreement"
	/>

	<span class="text-sm text-tertiary">
		{$i18n.wallet_connect.text.unknown_call_agreement}
	</span>
</label>
