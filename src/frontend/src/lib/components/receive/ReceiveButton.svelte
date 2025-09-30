<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import { RECEIVE_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onClick: () => void;
	}

	let { onClick }: Props = $props();
</script>

<ButtonHero
	ariaLabel={$i18n.receive.text.receive}
	disabled={$isBusy}
	onclick={onClick}
	testId={RECEIVE_TOKENS_MODAL_OPEN_BUTTON}
>
	{#snippet icon()}
		<IconQr size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.receive.text.receive}
	{/snippet}
</ButtonHero>
