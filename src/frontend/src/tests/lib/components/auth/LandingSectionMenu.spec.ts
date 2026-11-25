import LandingSectionMenu from '$lib/components/auth/LandingSectionMenu.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { landingSectionLinks } from '$lib/utils/landing.utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LandingSectionMenu', () => {
	const { auth, navigation, swap } = get(i18n);
	const { borrow_eyebrow, sections_button, sections_label } = auth.landing;

	const renderMenu = () => {
		const result = render(LandingSectionMenu);
		const button = result.getByRole('button', { name: sections_button });

		return { ...result, button };
	};

	it('shows only the button until it is pressed', () => {
		const { button, queryByRole } = renderMenu();

		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(button).toHaveAttribute('aria-controls', 'landing-section-menu');
		expect(queryByRole('navigation', { name: sections_label })).not.toBeInTheDocument();
	});

	it('opens the section links above the button', async () => {
		const { button, getByRole } = renderMenu();

		await fireEvent.click(button, { detail: 1 });

		const nav = getByRole('navigation', { name: sections_label });

		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(nav).toHaveAttribute('id', 'landing-section-menu');

		for (const { label, href } of landingSectionLinks(get(i18n))) {
			expect(getByRole('link', { name: label })).toHaveAttribute('href', href);
		}
	});

	it('closes when a section is picked', async () => {
		const { button, getByRole } = renderMenu();

		await fireEvent.click(button, { detail: 1 });
		await fireEvent.click(getByRole('link', { name: swap.text.swap }));

		expect(button).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes on a second press', async () => {
		const { button } = renderMenu();

		await fireEvent.click(button, { detail: 1 });
		await fireEvent.click(button, { detail: 1 });

		expect(button).toHaveAttribute('aria-expanded', 'false');
	});

	it('moves focus to the first link when opened from the keyboard', async () => {
		const { button, getByRole } = renderMenu();

		await fireEvent.click(button, { detail: 0 });

		await waitFor(() => expect(getByRole('link', { name: navigation.text.tokens })).toHaveFocus());
	});

	it('leaves focus on the button when opened by a tap', async () => {
		const { button } = renderMenu();

		button.focus();
		await fireEvent.click(button, { detail: 1 });

		expect(button).toHaveFocus();
	});

	it('closes on Escape and returns focus to the button', async () => {
		const { button } = renderMenu();

		await fireEvent.click(button, { detail: 0 });
		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(button).toHaveFocus();
	});

	it('closes on a press outside the menu', async () => {
		const { button } = renderMenu();

		await fireEvent.click(button, { detail: 1 });
		await fireEvent.pointerDown(document.body);

		expect(button).toHaveAttribute('aria-expanded', 'false');
	});

	it('stays open on a press inside the menu', async () => {
		const { button, getByRole } = renderMenu();

		await fireEvent.click(button, { detail: 1 });
		await fireEvent.pointerDown(getByRole('link', { name: borrow_eyebrow }));

		expect(button).toHaveAttribute('aria-expanded', 'true');
	});
});
