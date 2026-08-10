<script lang="ts">
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import { MANAGE_TOKENS_MODAL_NEXT_BUTTON } from '$lib/constants/test-ids.constants';

	interface Props {
		invalid: boolean;
		onBack: () => void;
	}

	let { invalid, onBack }: Props = $props();
</script>

<ButtonGroup>
	<ButtonBack onclick={onBack} />
	<ButtonNext disabled={invalid} testId={MANAGE_TOKENS_MODAL_NEXT_BUTTON} />
</ButtonGroup>
