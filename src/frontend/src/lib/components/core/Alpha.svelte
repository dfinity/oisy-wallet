<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import { OISY_ALPHA_WARNING_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	href={OISY_ALPHA_WARNING_URL}
	rel="external noopener noreferrer"
	target="_blank"
	class="inline-flex items-center gap-2 no-underline px-6 py-2 font-bold text-xs md:text-base mx-auto max-w-72 md:max-w-[100%]"
>
	<IconWarning inline />
	<span>{$i18n.hero.text.use_with_caution}</span>
</a>

<style lang="scss">
	a {
		color: var(--alpha-color, var(--color-misty-rose));
	}
</style>
