<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<p class="text-secondary mt-4 opacity-50">{replaceOisyPlaceholders($i18n.dapps.text.sign_in)}</p>
