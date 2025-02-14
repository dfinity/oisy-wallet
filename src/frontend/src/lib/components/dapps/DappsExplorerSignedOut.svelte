<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<p class="mt-4 text-tertiary">{replaceOisyPlaceholders($i18n.dapps.text.sign_in)}</p>
