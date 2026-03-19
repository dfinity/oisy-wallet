<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<ButtonHero ariaLabel={$i18n.tip.text.send_tip} disabled={$isBusy} {onclick}>
	{#snippet icon()}
		<IconGift size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.tip.text.send_tip}
	{/snippet}
</ButtonHero>
