<script lang="ts">
	import IconBuy from '$lib/components/icons/IconBuy.svelte';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ButtonHero on:click disabled={$isBusy} ariaLabel={$i18n.send.text.send}>
	<IconBuy size="28" slot="icon" />
	{$i18n.buy.text.buy}
</ButtonHero>
