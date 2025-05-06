<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let title: string | undefined;
</script>

{isNullish(title)
	? $i18n.receive.text.receive
	: replacePlaceholders($i18n.receive.text.receive_token, {
			$token: title
		})}
