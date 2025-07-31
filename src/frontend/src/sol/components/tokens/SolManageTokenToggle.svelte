<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!-- For now, we just handle native SOL tokens, they are not manageable. -->
<Toggle ariaLabel={$i18n.tokens.text.hide_token} checked disabled />
