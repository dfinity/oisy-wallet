<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let title: string;
	export let description: string;
</script>

<div>
	<div class="gap-3 font-bold flex items-center text-primary">
		<slot name="icon" />
		<Html text={replaceOisyPlaceholders(title)} />
	</div>
	<p class="mt-2 mb-0 text-sm sm:text-base">
		<Html text={replaceOisyPlaceholders(description)} />
	</p>
</div>
