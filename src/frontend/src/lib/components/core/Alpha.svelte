<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import { OISY_ALPHA_WARNING_URL } from '$lib/constants/oisy.constants';
</script>

<a
	href={OISY_ALPHA_WARNING_URL}
	rel="external noopener noreferrer"
	target="_blank"
	class="no-underline inline-flex items-center gap-2 text-center px-6 py-2 font-bold text-xs md:text-base"
>
	<IconWarning inline />
	<span class="pl-1">Learn more about this alpha version. Use with caution.</span>
</a>

<style lang="scss">
	a {
		color: var(--alpha-color, var(--color-misty-rose));
		max-width: 300px;
		margin: 0 auto;

		@include media.min-width(medium) {
			max-width: 100%;
		}
	}
</style>
