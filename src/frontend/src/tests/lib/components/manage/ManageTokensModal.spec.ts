import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, screen } from '@testing-library/svelte';

describe('ManageTokensModal', () => {
	beforeEach(() => {
		mockPage.reset();
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
