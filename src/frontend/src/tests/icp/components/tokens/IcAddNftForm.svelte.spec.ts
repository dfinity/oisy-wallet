import IcAddNftForm from '$icp/components/tokens/IcAddNftForm.svelte';
import { detectNftCanisterStandard } from '$icp/services/ic-standard.services';
import { MANAGE_TOKENS_IC_ADD_NFT_INPUT } from '$lib/constants/test-ids.constants';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockDip721TokenCanisterId } from '$tests/mocks/dip721-tokens.mock';
import { mockExtV2TokenCanisterId } from '$tests/mocks/ext-v2-token.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('@dfinity/utils', async () => {
	const actual = await vi.importActual('@dfinity/utils');
	return {
		...actual,
		debounce: (fn: () => void) => fn // Execute immediately instead of debouncing
	};
});

vi.mock('$icp/services/ic-standard.services', () => ({
	detectNftCanisterStandard: vi.fn()
}));

describe('IcAddNftForm', () => {
	const props = {
		extCanisterId: undefined,
		dip721CanisterId: undefined,
		icPunksCanisterId: undefined
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		vi.mocked(detectNftCanisterStandard).mockResolvedValue('ext');
	});

	it('should render the input', () => {
		const { getByText, getByPlaceholderText } = render(IcAddNftForm);

		expect(
			getByText(`${en.tokens.import.text.canister_id}:`, { exact: false })
		).toBeInTheDocument();
		expect(getByPlaceholderText('_____-_____-_____-_____-cai')).toBeInTheDocument();

		expect(getByText(en.tokens.import.text.info_ext)).toBeInTheDocument();
	});

	it('should set the EXT canister ID if it is recognized', async () => {
		vi.mocked(detectNftCanisterStandard).mockResolvedValue('ext');

		const testProps = $state(props);

		const { getByTestId, queryByText } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: mockExtV2TokenCanisterId } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: mockExtV2TokenCanisterId
			});

			expect(testProps.extCanisterId).toBe(mockExtV2TokenCanisterId);
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();
		});

		expect(queryByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)).toBeNull();
	});

	it('should set the DIP721 canister ID if it is recognized', async () => {
		vi.mocked(detectNftCanisterStandard).mockResolvedValue('dip721');

		const testProps = $state(props);

		const { getByTestId, queryByText } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: mockDip721TokenCanisterId } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: mockDip721TokenCanisterId
			});

			expect(testProps.extCanisterId).toBeUndefined();
			expect(testProps.dip721CanisterId).toBe(mockDip721TokenCanisterId);
			expect(testProps.icPunksCanisterId).toBeUndefined();
		});

		expect(queryByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)).toBeNull();
	});

	it('should set the ICPunks canister ID if it is recognized', async () => {
		vi.mocked(detectNftCanisterStandard).mockResolvedValue('icpunks');

		const testProps = $state(props);

		const { getByTestId, queryByText } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: mockIcPunksCanisterId } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: mockIcPunksCanisterId
			});

			expect(testProps.extCanisterId).toBeUndefined();
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBe(mockIcPunksCanisterId);
		});

		expect(queryByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)).toBeNull();
	});

	it('should show a warning if the standard is not recognized', async () => {
		vi.mocked(detectNftCanisterStandard).mockResolvedValue(undefined);

		const testProps = $state(props);

		const { getByText, getByTestId } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: 'any-value' } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: 'any-value'
			});

			expect(testProps.extCanisterId).toBeUndefined();
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();
		});

		expect(
			getByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)
		).toBeInTheDocument();
	});

	it('should show a warning if the canister is changed to one that is not recognized', async () => {
		vi.mocked(detectNftCanisterStandard).mockResolvedValue('ext');

		const testProps = $state(props);

		const { getByText, queryByText, getByTestId } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: mockExtV2TokenCanisterId } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: mockExtV2TokenCanisterId
			});

			expect(testProps.extCanisterId).toBe(mockExtV2TokenCanisterId);
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();

			expect(queryByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)).toBeNull();
		});

		vi.mocked(detectNftCanisterStandard).mockReset();

		vi.mocked(detectNftCanisterStandard).mockResolvedValue(undefined);

		await fireEvent.input(input, { target: { value: 'any-value' } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: 'any-value'
			});

			expect(testProps.extCanisterId).toBeUndefined();
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();

			expect(
				getByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)
			).toBeInTheDocument();
		});
	});

	it('should hide the warning if the canister is changed to one that is recognized', async () => {
		vi.mocked(detectNftCanisterStandard).mockResolvedValue(undefined);

		const testProps = $state(props);

		const { getByText, queryByText, getByTestId } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: 'any-value' } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: 'any-value'
			});

			expect(testProps.extCanisterId).toBeUndefined();
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();

			expect(
				getByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)
			).toBeInTheDocument();
		});

		vi.mocked(detectNftCanisterStandard).mockReset();

		vi.mocked(detectNftCanisterStandard).mockResolvedValue('ext');

		await fireEvent.input(input, { target: { value: mockExtV2TokenCanisterId } });

		await waitFor(() => {
			expect(detectNftCanisterStandard).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: mockExtV2TokenCanisterId
			});

			expect(testProps.extCanisterId).toBe(mockExtV2TokenCanisterId);
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();

			expect(queryByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)).toBeNull();
		});
	});

	it('should do nothing if identity is nullish', async () => {
		mockAuthStore(null);

		const testProps = $state(props);

		const { queryByText, getByTestId } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: mockExtV2TokenCanisterId } });

		await tick();

		await waitFor(() => {
			expect(testProps.extCanisterId).toBeUndefined();
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();
		});

		expect(detectNftCanisterStandard).not.toHaveBeenCalled();

		expect(queryByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)).toBeNull();
	});

	it('should reset the values if the input is modified to empty', async () => {
		const testProps = $state(props);

		const { queryByText, getByTestId } = render(IcAddNftForm, {
			props: testProps
		});

		const input = getByTestId(MANAGE_TOKENS_IC_ADD_NFT_INPUT);

		await fireEvent.input(input, { target: { value: mockExtV2TokenCanisterId } });

		await waitFor(() => {
			expect(testProps.extCanisterId).toBe(mockExtV2TokenCanisterId);
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();
		});

		await fireEvent.input(input, { target: { value: '' } });

		await waitFor(() => {
			expect(testProps.extCanisterId).toBeUndefined();
			expect(testProps.dip721CanisterId).toBeUndefined();
			expect(testProps.icPunksCanisterId).toBeUndefined();
		});

		expect(queryByText(en.tokens.import.error.unrecognized_nft_canister_id_standard)).toBeNull();
	});
});
