import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import { MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS } from '$lib/constants/test-ids.constants';
import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { render, screen } from '@testing-library/svelte';

describe('ManageTokensModal', () => {
	beforeEach(() => {
		mockPage.reset();

		icrcUnavailableCustomTokensStore.set([]);
	});

	describe('unavailable tokens', () => {
		const ledgerCanisterId = 'aiw2p-tyaaa-aaaam-aebyq-cai';

		beforeEach(() => {
			icrcUnavailableCustomTokensStore.set([
				{
					ledgerCanisterId,
					customToken: {
						token: {
							Icrc: { ledger_id: Principal.fromText(ledgerCanisterId), index_id: toNullable() }
						},
						version: toNullable(1n),
						enabled: true,
						section: toNullable(),
						allow_external_content_source: toNullable(),
						allowed_external_content_source_urls: toNullable()
					}
				}
			]);
		});

		it('should list them on all networks', () => {
			render(ManageTokensModal);

			expect(screen.getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS)).toHaveTextContent(
				ledgerCanisterId
			);
		});

		it('should list them on the Internet Computer network', () => {
			render(ManageTokensModal, { props: { initialNetwork: ICP_NETWORK } });

			expect(screen.getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS)).toBeInTheDocument();
		});

		it('should not list them on another network', () => {
			render(ManageTokensModal, { props: { initialNetwork: ETHEREUM_NETWORK } });

			expect(screen.queryByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS)).not.toBeInTheDocument();
		});

		it('should not list them when managing collections', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Nfts}` });

			render(ManageTokensModal);

			expect(screen.queryByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS)).not.toBeInTheDocument();
		});
	});

	it('should open the import step with the initial Ethereum token address', async () => {
		render(ManageTokensModal, {
			props: {
				initialNetwork: ETHEREUM_NETWORK,
				initialTokenData: {
					ethContractAddress: mockEthAddress3
				},
				initialStep: WizardStepsManageTokens.IMPORT
			}
		});

		await expect(screen.findByText(en.tokens.import.text.title)).resolves.toBeInTheDocument();
		await expect(screen.findByDisplayValue(mockEthAddress3)).resolves.toBeInTheDocument();
	});
});
