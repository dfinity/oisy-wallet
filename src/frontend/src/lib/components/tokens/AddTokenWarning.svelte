<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import Alert from '$lib/components/ui/Alert.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Alert alertType="light-warning">
	<span>
		<Html text={$i18n.tokens.warning.trust_token} />
	</span>
</Alert>

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
