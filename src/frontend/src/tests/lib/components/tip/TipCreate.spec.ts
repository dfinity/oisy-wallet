import TipCreate from '$lib/components/tip/TipCreate.svelte';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import type { TokenId } from '$lib/types/token';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get, type Writable } from 'svelte/store';

// Mocked rather than spied on: the component reads a module-level `derived`,
// which captures its input stores the first time the module is imported.
vi.mock('$lib/derived/tips.derived', async () => {
	const { writable } = await import('svelte/store');

	return { reservedTipAmounts: writable<Record<TokenId, bigint>>({}) };
});

describe('TipCreate', () => {
	const token = { ...mockValidIcToken, symbol: 'ICP', decimals: 8, fee: 10_000n };

	const props = {
		token,
		amount: undefined,
		durationMs: 86_400_000,
		message: '',
		onSelectToken: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn()
	};

	// `TipCreate` renders `StakeForm`, which reads the send context.
	const context = new Map([[SEND_CONTEXT_KEY, initSendContext({ token })]]);

	let reserved: Writable<Record<TokenId, bigint>>;

	beforeAll(async () => {
		({ reservedTipAmounts: reserved } = (await import('$lib/derived/tips.derived')) as unknown as {
			reservedTipAmounts: Writable<Record<TokenId, bigint>>;
		});
	});

	beforeEach(() => {
		reserved.set({});
		balancesStore.reset(token.id);
	});

	describe('before the balance is known', () => {
		// `icrc2_approve` does not check the allowance against the balance — only
		// the fee — so nothing on the ledger side stops a tip being approved for
		// more than the sender holds. It is created, and then dies on the
		// recipient's screen as `shortBalance`. This form's ceiling is the only
		// thing preventing that, and the ceiling is derived from the balance.
		const withAmount = { ...props, amount: '0.5' };

		const generate = (container: HTMLElement) =>
			container.querySelector<HTMLButtonElement>(`button[data-tid=${STAKE_FORM_REVIEW_BUTTON}]`);

		it('will not generate while the balance is still unknown', async () => {
			const { container } = render(TipCreate, { props: withAmount, context });

			await waitFor(() => expect(generate(container)).toBeInTheDocument());

			expect(generate(container)).toBeDisabled();
		});

		it('generates once the balance has arrived', async () => {
			balancesStore.set({ id: token.id, data: { data: 100_000_000n, certified: false } });

			const { container } = render(TipCreate, { props: withAmount, context });

			await waitFor(() => expect(generate(container)).toBeEnabled());
		});
	});

	it('says nothing about reservations when there are none', () => {
		// Most senders have no live tips. A warning panel on every visit would be
		// noise that trains people to ignore the one time it matters.
		const { queryByText } = render(TipCreate, { props, context });

		expect(queryByText(/already promised to tips/)).not.toBeInTheDocument();
	});

	it('explains the shortfall when live tips are holding funds back', async () => {
		// The bug this closes: a sender whose tips already cover their balance saw a
		// red "Max: 0" and no reason for it — a correct number that reads as broken.
		reserved.set({ [token.id]: 200_020_000n } as Record<TokenId, bigint>);

		const { getByText } = render(TipCreate, { props, context });

		await waitFor(() => expect(getByText(/already promised to tips/)).toBeInTheDocument());

		// Quoted as a token amount, not base units.
		expect(getByText(/2\.0002 ICP/)).toBeInTheDocument();
	});

	it('points at the way out rather than only naming the problem', async () => {
		reserved.set({ [token.id]: 200_020_000n } as Record<TokenId, bigint>);

		const { getByText } = render(TipCreate, { props, context });

		await waitFor(() =>
			expect(
				getByText(new RegExp(get(i18n).tip.text.reserved_by_tips.slice(-40)))
			).toBeInTheDocument()
		);
	});
});
