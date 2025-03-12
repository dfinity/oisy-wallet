import { CkBTCUpdateBalanceScheduler } from '$icp/schedulers/ckbtc-update-balance.scheduler';
import type {
	PostMessage,
	PostMessageDataRequestIcCkBTCUpdateBalance
} from '$lib/types/post-message';

const scheduler = new CkBTCUpdateBalanceScheduler();

export const onCkBtcUpdateBalanceMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestIcCkBTCUpdateBalance>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkBTCUpdateBalanceTimer':
			scheduler.stop();
			return;
		case 'startCkBTCUpdateBalanceTimer':
			await scheduler.start(data);
			return;
	}
};
