<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { RECEIVE_CHANGE_TOKEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		// Back returns to a choice the person saw; otherwise the step was opened for them, from a token
		// page, and the way out of it is to change the token.
		back: boolean;
		onclick: () => void;
	}

	let { back, onclick }: Props = $props();
</script>

{#if back}
	<ButtonBack fullWidth {onclick} />
{:else}
	<Button colorStyle="secondary-light" fullWidth {onclick} testId={RECEIVE_CHANGE_TOKEN_BUTTON}>
		{$i18n.receive.token.text.change_token}
	</Button>
{/if}
