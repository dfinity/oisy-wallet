<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<MessageBox level="warning">
	<span>
		<Html text={$i18n.tokens.warning.trust_token} />
	</span>
</MessageBox>

<style lang="scss">
	span {
		:global(a) {
			&:active,
			&:hover {
				color: var(--color-base-white);
			}
		}
	}
</style>
