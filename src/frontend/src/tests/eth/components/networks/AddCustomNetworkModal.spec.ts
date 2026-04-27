import AddCustomNetworkModal from '$eth/components/networks/AddCustomNetworkModal.svelte';
import type { VerifyChainIdResult } from '$eth/services/chain-id-verification.services';
import {
	customEvmNetworksStore,
	type CustomEvmNetworkInput
} from '$eth/stores/custom-evm-networks.store';
import {
	ADD_CUSTOM_NETWORK_CONFIRM_BUTTON,
	ADD_CUSTOM_NETWORK_INPUT_CHAIN_ID,
	ADD_CUSTOM_NETWORK_INPUT_CURRENCY_SYMBOL,
	ADD_CUSTOM_NETWORK_INPUT_EXPLORER_URL,
	ADD_CUSTOM_NETWORK_INPUT_NAME,
	ADD_CUSTOM_NETWORK_INPUT_RPC_URL,
	ADD_CUSTOM_NETWORK_MODAL,
	ADD_CUSTOM_NETWORK_VERIFICATION_BANNER,
	ADD_CUSTOM_NETWORK_VERIFY_BUTTON,
	MODAL_TITLE
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

const validInput: CustomEvmNetworkInput = {
	name: 'Optimism',
	chainId: 10n,
	rpcUrl: 'https://mainnet.optimism.io',
	currencySymbol: 'ETH',
	explorerUrl: 'https://optimistic.etherscan.io',
	env: 'mainnet'
};

/**
 * Fill in the six required form fields with a valid Optimism fixture. The
 * individual tests override specific fields as needed — e.g. to leave one
 * blank to trigger a required-field error.
 *
 * The parameter is typed structurally rather than as
 * `ReturnType<typeof render>` because the generic default of
 * `RenderResult<Component | SvelteComponent, Queries>` makes `container`
 * incompatible with the `Queries` index signature when `tsc` runs over
 * `tsconfig.spec.json`.
 */
const fillForm = async (rendered: { getByTestId: (testId: string) => HTMLElement }) => {
	const set = async ({ testId, value }: { testId: string; value: string }) =>
		await fireEvent.input(rendered.getByTestId(testId), { target: { value } });
	await set({ testId: ADD_CUSTOM_NETWORK_INPUT_NAME, value: validInput.name });
	await set({ testId: ADD_CUSTOM_NETWORK_INPUT_CHAIN_ID, value: validInput.chainId.toString() });
	await set({ testId: ADD_CUSTOM_NETWORK_INPUT_RPC_URL, value: validInput.rpcUrl });
	await set({
		testId: ADD_CUSTOM_NETWORK_INPUT_CURRENCY_SYMBOL,
		value: validInput.currencySymbol
	});
	await set({ testId: ADD_CUSTOM_NETWORK_INPUT_EXPLORER_URL, value: validInput.explorerUrl });
};

describe('AddCustomNetworkModal', () => {
	beforeEach(() => {
		customEvmNetworksStore.reset();
	});

	it('renders on the form step with the "Add custom EVM network" title', () => {
		const probe = vi.fn();

		const { getByTestId } = render(AddCustomNetworkModal, { probe });

		expect(getByTestId(ADD_CUSTOM_NETWORK_MODAL)).toBeInTheDocument();
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.custom_networks.text.add_title);
		expect(probe).not.toHaveBeenCalled();
	});

	it('shows per-field errors and does not probe when the form is empty', async () => {
		// The pure parser short-circuits on required-field errors so hitting
		// the network would be wasted work — and the probe result would be
		// indistinguishable from a real "unreachable" failure for the user.
		const probe = vi.fn();

		const { getByTestId, findByText } = render(AddCustomNetworkModal, { probe });

		await fireEvent.click(getByTestId(ADD_CUSTOM_NETWORK_VERIFY_BUTTON));

		await expect(findByText(en.custom_networks.error.name_required)).resolves.toBeInTheDocument();
		expect(probe).not.toHaveBeenCalled();
	});

	it('shows a chain-mismatch banner and stays on the form step', async () => {
		// The RPC reported a different chain ID than what the user typed —
		// classic phishing/copy-paste mistake. We block the add and surface
		// the actual chain ID so the user can fix the form.
		const probe = vi.fn().mockResolvedValue({
			status: 'mismatch',
			actualChainId: 137n
		} satisfies VerifyChainIdResult);

		const rendered = render(AddCustomNetworkModal, { probe });
		await fillForm(rendered);
		await fireEvent.click(rendered.getByTestId(ADD_CUSTOM_NETWORK_VERIFY_BUTTON));

		await waitFor(() => {
			expect(rendered.getByTestId(ADD_CUSTOM_NETWORK_VERIFICATION_BANNER)).toHaveTextContent('137');
		});

		// Still on the form step — title unchanged.
		expect(rendered.getByTestId(MODAL_TITLE)).toHaveTextContent(en.custom_networks.text.add_title);
	});

	it('shows an rpc-unreachable banner with the probe error', async () => {
		const probe = vi.fn().mockResolvedValue({
			status: 'unreachable',
			error: 'getaddrinfo ENOTFOUND'
		} satisfies VerifyChainIdResult);

		const rendered = render(AddCustomNetworkModal, { probe });
		await fillForm(rendered);
		await fireEvent.click(rendered.getByTestId(ADD_CUSTOM_NETWORK_VERIFY_BUTTON));

		await waitFor(() => {
			expect(rendered.getByTestId(ADD_CUSTOM_NETWORK_VERIFICATION_BANNER)).toHaveTextContent(
				'getaddrinfo ENOTFOUND'
			);
		});
	});

	it('advances to the review step and persists on confirm', async () => {
		const probe = vi.fn().mockResolvedValue({ status: 'ok' } satisfies VerifyChainIdResult);

		const rendered = render(AddCustomNetworkModal, { probe });
		await fillForm(rendered);
		await fireEvent.click(rendered.getByTestId(ADD_CUSTOM_NETWORK_VERIFY_BUTTON));

		// Probe received the parsed values — note chainId is bigint here, not
		// the raw string the user typed. That's the whole point of the parser.
		expect(probe).toHaveBeenCalledExactlyOnceWith({
			rpcUrl: validInput.rpcUrl,
			expectedChainId: validInput.chainId
		});

		await waitFor(() => {
			expect(rendered.getByTestId(MODAL_TITLE)).toHaveTextContent(
				en.custom_networks.text.review_title
			);
		});

		// Review shows the parsed chain ID as a decimal, and the RPC URL.
		expect(rendered.getByText(validInput.rpcUrl)).toBeInTheDocument();
		expect(rendered.getByText(validInput.chainId.toString())).toBeInTheDocument();

		// Confirming adds to the store.
		await fireEvent.click(rendered.getByTestId(ADD_CUSTOM_NETWORK_CONFIRM_BUTTON));

		await waitFor(() => {
			expect(get(customEvmNetworksStore)).toHaveLength(1);
		});

		expect(get(customEvmNetworksStore)[0]).toMatchObject(validInput);
	});

	it('surfaces a duplicate banner and returns to the form on persist failure', async () => {
		// Another tab added the same chain ID between Verify and Add. The
		// store throws synchronously; we translate that into the form-level
		// "duplicate" banner so the user can change the ID without losing
		// the other fields.
		customEvmNetworksStore.add(validInput);

		const probe = vi.fn().mockResolvedValue({ status: 'ok' } satisfies VerifyChainIdResult);

		const rendered = render(AddCustomNetworkModal, { probe });
		await fillForm(rendered);
		await fireEvent.click(rendered.getByTestId(ADD_CUSTOM_NETWORK_VERIFY_BUTTON));

		await waitFor(() => {
			expect(rendered.getByTestId(MODAL_TITLE)).toHaveTextContent(
				en.custom_networks.text.review_title
			);
		});

		await fireEvent.click(rendered.getByTestId(ADD_CUSTOM_NETWORK_CONFIRM_BUTTON));

		await waitFor(() => {
			expect(rendered.getByTestId(MODAL_TITLE)).toHaveTextContent(
				en.custom_networks.text.add_title
			);
			expect(rendered.getByTestId(ADD_CUSTOM_NETWORK_VERIFICATION_BANNER)).toHaveTextContent(
				en.custom_networks.error.duplicate
			);
		});

		// Store is unchanged — still the single pre-seeded network.
		expect(get(customEvmNetworksStore)).toHaveLength(1);
	});
});
