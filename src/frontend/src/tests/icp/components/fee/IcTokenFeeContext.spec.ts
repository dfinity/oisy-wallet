import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import IcTokenFeeContext from '$icp/components/fee/IcTokenFeeContext.svelte';
import {
	IC_TOKEN_FEE_CONTEXT_KEY,
	icTokenFeeStore,
	type IcTokenFeeStore
} from '$icp/stores/ic-token-fee.store';
import * as authStore from '$lib/derived/auth.derived';
import * as authServices from '$lib/services/auth.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import type { Identity } from '@dfinity/agent';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('IcTokenFeeContext', () => {
	const mockFee = 10000n;
	const mockContext = (store: IcTokenFeeStore) => new Map([[IC_TOKEN_FEE_CONTEXT_KEY, { store }]]);
	const mockTransactionFee = () =>
		vi.spyOn(icrcLedgerApi, 'transactionFee').mockResolvedValue(mockFee);
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	const props = {
		token: ICP_TOKEN,
		children: mockSnippet
	};

	beforeEach(() => {
		icTokenFeeStore.reset();
	});

	it('should call setIcTokenFee with proper params', async () => {
		const setIcTokenFeeSpy = vi.spyOn(icTokenFeeStore, 'setIcTokenFee');
		const transactionFeeSpy = mockTransactionFee();

		mockAuthStore();

		render(IcTokenFeeContext, {
			props,
			context: mockContext(icTokenFeeStore)
		});

		await waitFor(() => {
			expect(transactionFeeSpy).toHaveBeenCalledOnce();
			expect(transactionFeeSpy).toHaveBeenCalledWith({
				ledgerCanisterId: ICP_TOKEN.ledgerCanisterId,
				identity: mockIdentity
			});
			expect(setIcTokenFeeSpy).toHaveBeenCalledOnce();
			expect(setIcTokenFeeSpy).toHaveBeenCalledWith({
				tokenSymbol: ICP_TOKEN.symbol,
				fee: mockFee
			});
		});
	});

	it('should not call transactionFee if no authIdentity available', async () => {
		const nullishSignOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();

		mockAuthStore(null);

		render(IcTokenFeeContext, {
			props,
			context: mockContext(icTokenFeeStore)
		});

		await waitFor(() => {
			expect(nullishSignOutSpy).toHaveBeenCalledOnce();
		});
	});

	it('should not call transactionFee if no token provided', async () => {
		const transactionFeeSpy = mockTransactionFee();

		mockAuthStore();

		render(IcTokenFeeContext, {
			props: { ...props, token: undefined },
			context: mockContext(icTokenFeeStore)
		});

		await waitFor(() => {
			expect(transactionFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call transactionFee if token fee is already known', async () => {
		const transactionFeeSpy = mockTransactionFee();

		mockAuthStore();

		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: ICP_TOKEN.symbol,
			fee: mockFee
		});
		render(IcTokenFeeContext, {
			props,
			context: mockContext(icTokenFeeStore)
		});

		await waitFor(() => {
			expect(transactionFeeSpy).not.toHaveBeenCalled();
		});
	});

	it('should set a fallback token fee if transactionFee fails', async () => {
		vi.spyOn(icrcLedgerApi, 'transactionFee').mockImplementation(async () => {
			await Promise.resolve();
			throw new Error('error');
		});
		const setIcTokenFeeSpy = vi.spyOn(icTokenFeeStore, 'setIcTokenFee');

		mockAuthStore();
		render(IcTokenFeeContext, {
			props,
			context: mockContext(icTokenFeeStore)
		});

		await waitFor(() => {
			expect(setIcTokenFeeSpy).toHaveBeenCalledOnce();
			expect(setIcTokenFeeSpy).toHaveBeenCalledWith({
				tokenSymbol: ICP_TOKEN.symbol,
				fee: ICP_TOKEN.fee
			});
		});
	});
});
