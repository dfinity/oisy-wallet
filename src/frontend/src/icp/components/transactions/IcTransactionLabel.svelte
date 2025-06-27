<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionToken, Token } from '$lib/types/token';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		label: string | undefined;
		fallback: string;
		token: OptionToken;
	}

	const { label, fallback = '', token }: Props = $props();

	let fallbackLabel: string = $derived(fallback.charAt(0).toUpperCase() + fallback.slice(1));

	let twinToken: Token | undefined = $derived((token as OptionIcCkToken)?.twinToken);

	let labelText: string = $derived(
		nonNullish(label) ? resolveText({ i18n: $i18n, path: label }) : fallbackLabel
	);
</script>

{replacePlaceholders(labelText, {
	$twinToken: twinToken?.symbol ?? '',
	$twinNetwork: twinToken?.network.name ?? '',
	$ckToken: token?.symbol ?? ''
})}
