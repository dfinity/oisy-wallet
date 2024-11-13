<script lang="ts">
	import { getContext } from 'svelte';
	import ConvertToken from '$lib/components/convert/ConvertToken.svelte';
	import IconMoveRight from '$lib/components/icons/lucide/IconMoveRight.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store.js';

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<div class="flex w-full flex-col items-center justify-center">
	<p class="font-bold">
		{$i18n.convert.text.review_tokens_info_title}
	</p>
	<div class="flex items-center">
		<ConvertToken token={$sourceToken} size="md" />
		<span class="mx-3"><IconMoveRight /></span>
		<ConvertToken token={$destinationToken} size="md" />
	</div>
</div>
