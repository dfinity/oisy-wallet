<script lang="ts">
	import { getContext } from 'svelte';
	import ConvertToken from '$lib/components/convert/ConvertToken.svelte';
	import IconMoveDown from '$lib/components/icons/lucide/IconMoveDown.svelte';
	import IconMoveRight from '$lib/components/icons/lucide/IconMoveRight.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<div class="flex w-full flex-1 flex-col items-center justify-center pb-6">
	<p class="font-bold">
		{$i18n.convert.text.review_tokens_info_title}
	</p>
	<div class="flex flex-col items-center sm:flex-row">
		<ConvertToken token={$sourceToken} size="md" />

		<span class="mx-3 hidden sm:block"><IconMoveRight /></span>
		<span class="my-3 block sm:hidden"><IconMoveDown /></span>

		<ConvertToken token={$destinationToken} size="md" />
	</div>
</div>
