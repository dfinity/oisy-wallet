<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		icon: Snippet;
		title: string;
		description: string;
	}

	let { icon, title, description }: Props = $props();
</script>

<div>
	<div class="flex items-center gap-3 font-bold text-primary">
		<div class="text-primary">
			{@render icon()}
		</div>
		<Html text={replaceOisyPlaceholders(title)} />
	</div>
	<p class="mb-0 mt-2 text-sm sm:text-base">
		<Html text={replaceOisyPlaceholders(description)} />
	</p>
</div>
