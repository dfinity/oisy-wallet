<script lang="ts">
	import oisyLogoLarge from '$lib/assets/oisy-logo-large.svg';
	import oisyLogoSmall from '$lib/assets/oisy-logo-small.svg';
	import OisyLogoLargeHalloween from '$lib/components/icons/OisyLogoLargeHalloween.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SeasonalGuard from '$lib/components/ui/SeasonalGuard.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel = $derived(replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME }));
</script>

<SeasonalGuard>
	{#snippet halloween()}
		<div class="invert-on-dark-theme logo-container 1.5xs:block hidden w-24 cursor-pointer">
			<OisyLogoLargeHalloween description={ariaLabel} />
		</div>
	{/snippet}

	<picture class="invert-on-dark-theme 1.5xs:block hidden w-24" aria-label={ariaLabel}>
		<source media="(max-width: 639px)" srcset={oisyLogoSmall} />
		<Img alt={ariaLabel} src={oisyLogoLarge} />
	</picture>
</SeasonalGuard>
