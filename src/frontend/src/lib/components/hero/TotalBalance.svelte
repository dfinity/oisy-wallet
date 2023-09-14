<script lang="ts">
	import { formatNumberAsCurrency } from '$lib/utils/format.utils';
	import { totalFiatBalance } from '$lib/derived/totalfiatvalue.derived';
</script>

<span class="text-off-white mt">
	<output
		class={`break-words opacity-50`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
	{formatNumberAsCurrency({value: $totalFiatBalance || 0})}
	</output>
		<span class="opacity-100">USD</span>
</span>
