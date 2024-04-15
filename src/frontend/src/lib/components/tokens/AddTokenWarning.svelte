<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store.js';
	import Warning from '$lib/components/ui/Warning.svelte';
	import { Html } from '@dfinity/gix-components';
</script>

<Warning>
	<p>
		<Html text={$i18n.tokens.warning.trust_token} />
	</p>
</Warning>

<style lang="scss">
	p {
		:global(a) {
			&:active,
			&:hover {
				color: var(--color-off-white);
			}
		}
	}
</style>
