<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let title: string;
	export let description: string;
</script>

<div>
	<div class="flex items-center gap-3 font-bold text-primary">
		<div class="text-primary">
			<slot name="icon" />
		</div>
		<Html text={replaceOisyPlaceholders(title)} />
	</div>
	<p class="mb-0 mt-2 text-sm sm:text-base">
		<Html text={replaceOisyPlaceholders(description)} />
	</p>
</div>
