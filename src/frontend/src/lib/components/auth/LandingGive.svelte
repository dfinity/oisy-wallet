<script lang="ts">
	import tipDark from '$lib/assets/landing-tip-dark.webp';
	import tipLight from '$lib/assets/landing-tip-light.webp';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import IconNotebook from '$lib/components/icons/lucide/IconNotebook.svelte';
	import IconUsersRound from '$lib/components/icons/lucide/IconUsersRound.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';

	const features = $derived([
		{
			id: 'notes',
			Icon: IconNotebook,
			title: $i18n.notes.text.title,
			description: $i18n.auth.landing.notes_description
		},
		{
			id: 'contacts',
			Icon: IconUsersRound,
			title: $i18n.address_book.text.title,
			description: $i18n.auth.landing.contacts_description
		}
	]);
</script>

<section
	class="flex w-full flex-col gap-8 border-t border-tertiary py-16 md:gap-10 md:py-24"
	aria-labelledby="landing-give-title"
>
	<h2
		id="landing-give-title"
		class="m-0 max-w-3xl text-3xl leading-[1.1] font-bold tracking-tight text-balance text-primary md:text-[2.75rem]"
		{@attach landingReveal()}
	>
		{$i18n.auth.landing.give_title}
	</h2>

	<div class="grid gap-5 md:grid-cols-2">
		<div class="grid gap-5 md:auto-rows-fr">
			{#each features as { id, Icon, title, description }, index (id)}
				<article
					class="flex flex-col justify-center gap-3 rounded-[28px] border border-tertiary bg-primary p-6 md:px-8"
					{@attach landingReveal(LANDING_REVEAL_STAGGER * (index + 1))}
				>
					<span
						class="grid size-10 place-items-center rounded-xl bg-brand-subtle-10 text-brand-primary-alt"
						aria-hidden="true"
					>
						<Icon size="24" />
					</span>
					<div class="flex flex-col gap-2">
						<h3 class="m-0 text-xl font-bold text-balance text-primary">{title}</h3>
						<p class="m-0 text-base leading-relaxed text-pretty text-secondary">{description}</p>
					</div>
				</article>
			{/each}
		</div>

		<article
			class="grid grid-rows-[auto_1fr] overflow-hidden rounded-[28px] border border-tertiary bg-primary"
			{@attach landingReveal(2 * LANDING_REVEAL_STAGGER)}
		>
			<div class="flex flex-col gap-2 px-6 pt-7 md:px-8 md:pt-8">
				<h3 class="m-0 text-xl font-bold text-balance text-primary">
					{$i18n.auth.landing.tip_title}
				</h3>
				<p class="m-0 text-base leading-relaxed text-pretty text-secondary">
					{$i18n.auth.landing.tip_description}
				</p>
			</div>

			<div
				class="flex items-end justify-center bg-linear-to-b from-primary to-warning-subtle-10 px-6 pt-8 md:px-8"
			>
				<div
					class="phone aspect-[780/1100] w-[min(240px,70%)] overflow-hidden rounded-t-[34px] border-8 border-b-0"
				>
					<!-- Only the active theme's screen is visible and announced. -->
					<img
						class="size-full object-cover object-top dark:hidden"
						alt={$i18n.auth.landing.tip_preview}
						decoding="async"
						height="733"
						loading="lazy"
						src={tipLight}
						width="520"
					/>
					<img
						class="hidden size-full object-cover object-top dark:block"
						alt={$i18n.auth.landing.tip_preview}
						decoding="async"
						height="733"
						loading="lazy"
						src={tipDark}
						width="520"
					/>
				</div>
			</div>
		</article>
	</div>

	<div class="flex items-start gap-3 text-sm leading-relaxed" {@attach landingReveal()}>
		<span class="mt-0.5 shrink-0 text-secondary" aria-hidden="true"><IconScanLine /></span>
		<p class="m-0 text-pretty text-secondary">
			<strong class="me-1 font-semibold text-primary">{$i18n.auth.landing.pay_title}</strong>
			{$i18n.auth.landing.pay_description}
		</p>
	</div>
</section>

<style lang="scss">
	.phone {
		// The device bezel is the same near-black in both themes, like a real phone.
		border-color: #0f172a;
		box-shadow: 0 30px 60px -30px rgb(15 23 42 / 45%);
	}

	:global([theme='dark']) .phone {
		box-shadow:
			0 0 0 1px rgb(255 255 255 / 10%),
			0 30px 60px -30px rgb(0 0 0 / 60%);
	}
</style>
