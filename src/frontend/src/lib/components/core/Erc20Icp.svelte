<script lang="ts">
	import { ERC20_ICP_REPO_URL } from '$eth/constants/erc20-icp.constants';
	import { IconInfo } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	href={ERC20_ICP_REPO_URL}
	rel="external noopener noreferrer"
	target="_blank"
	class="no-underline inline-flex items-center gap-2 text-center pt-1 pb-3 font-bold text-xs md:text-base"
>
	<IconInfo />
	<span class="pl-1">{$i18n.hero.learn_more_about_erc20_icp}</span>
</a>

<style lang="scss">
	a {
		color: var(--alpha-color, var(--color-misty-rose));
		margin: 0 auto;

		:global(svg) {
			vertical-align: bottom;

			@include media.min-width(medium) {
				vertical-align: sub;
			}
		}
	}
</style>
