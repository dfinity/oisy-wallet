<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { token } from '$lib/derived/token.derived';
	import type { OptionIcCkToken } from '$icp/types/ic';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

	export let label: string | undefined;
	export let fallback = '';

	let twinToken: Token | undefined;
	$: twinToken = ($token as OptionIcCkToken)?.twinToken;
</script>

{replacePlaceholders(resolveText($i18n, label) ?? fallback, {
	$twinToken: twinToken?.symbol ?? '',
	$twinNetwork: twinToken?.network.name ?? ''
})}
