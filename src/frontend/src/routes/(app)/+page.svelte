<script lang="ts">
	import Assets from '$lib/components/tokens/Assets.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { AUDIT } from '$lib/constants/app.constants';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { TokenTypes } from '$lib/enums/token-types';
	import { i18n } from '$lib/stores/i18n.store';
</script>

{#if AUDIT && MOBILE_SHELL}
	<div class="mb-3">
		<Badge testId="mobile-web-update-test" variant="info" width="w-fit">
			{$i18n.tokens.text.mobile_web_update_test}
		</Badge>
	</div>
{/if}

<Assets tab={TokenTypes.TOKENS} />
