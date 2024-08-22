<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
</script>

<ButtonHero on:click disabled={$isBusy} ariaLabel={$i18n.receive.text.receive}>
	<IconReceive size="28" slot="icon" />
	{$i18n.receive.text.receive}
</ButtonHero>
