<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
</script>

<a
	href="https://github.com/dfinity/ic-eth-wallet"
	rel="external noopener noreferrer"
	target="_blank"
	class="no-underline inline-block text-center px-3 py-1 font-bold text-xs md:text-base"
>
	<IconWarning inline />
	<span class="pl-1">Learn more about this alpha version. Use with caution.</span>
</a>

<style lang="scss">
	@use '../../../../../../node_modules/@dfinity/gix-components/dist/styles/mixins/media';

	a {
		color: var(--alpha-color, var(--color-misty-rose));
		max-width: 300px;
		margin: 0 auto;

		@include media.min-width(medium) {
			max-width: 100%;
		}
	}
</style>
