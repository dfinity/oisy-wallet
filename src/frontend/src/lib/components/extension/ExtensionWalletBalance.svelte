<script lang="ts">
	import { page } from '$app/state';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import HeroButtonGroup from '$lib/components/ui/HeroButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const openOisy = () => window.open(page.url.origin, '_blank', 'noopener,noreferrer');
</script>

<!-- OISY's own hero card. The panel selects no network, so it shows the same total as the app's home with all networks. Sending, swapping and buying happen in the app. -->
<HeroContent>
	{#snippet actions()}
		<HeroButtonGroup>
			<Receive />

			<ButtonHero ariaLabel={$i18n.extension.panel.open_oisy} onclick={openOisy}>
				{#snippet icon()}
					<IconExternalLink size="24" />
				{/snippet}
				{#snippet label()}
					{$i18n.extension.panel.open_oisy}
				{/snippet}
			</ButtonHero>
		</HeroButtonGroup>
	{/snippet}
</HeroContent>
