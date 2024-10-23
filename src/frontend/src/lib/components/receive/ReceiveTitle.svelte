<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	export let addressToken: Token | undefined;

	let symbol: string | undefined;
	$: symbol = addressToken?.symbol;
</script>

{isNullish(symbol)
	? $i18n.receive.text.receive
	: replacePlaceholders($i18n.receive.text.receive_token, {
			$token: symbol
		})}
