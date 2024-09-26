<script lang="ts">
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { OISY_ALPHA_WARNING_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	href={OISY_ALPHA_WARNING_URL}
	rel="external noopener noreferrer"
	target="_blank"
	class="mx-auto no-underline"
>
	<WarningBanner>
		{$i18n.hero.text.use_with_caution}
	</WarningBanner>
</a>
