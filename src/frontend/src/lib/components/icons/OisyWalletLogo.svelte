<script lang="ts">
	import oisyLogoLarge from '$lib/assets/oisy-logo-large.svg';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel: string;
	$: ariaLabel = replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME });
</script>

<div class="flex items-center gap-2">
	<IconAstronautHelmet />
	<div class="hidden sm:block">
		<Img src={oisyLogoLarge} alt={ariaLabel} />
	</div>
</div>
