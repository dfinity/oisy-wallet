<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import Warning from '$lib/components/ui/Warning.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Warning>
	<span>
		<Html text={$i18n.tokens.warning.trust_token} />
	</span>
</Warning>

<style lang="scss">
	span {
		:global(a) {
			&:active,
			&:hover {
				color: var(--color-off-white);
			}
		}
	}
</style>
