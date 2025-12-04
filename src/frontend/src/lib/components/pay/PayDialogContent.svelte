<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div>
	<p class="mt-2 mb-0 text-sm sm:text-base">
		<Html text={replaceOisyPlaceholders($i18n.pay.text.dialog_description)} />
	</p>
</div>
