import type QrCreator from 'qr-creator';

export type QrCreatorConfig = QrCreator.Config;
export interface QrCreatorClass {
	render: (config: QrCreatorConfig, $element: HTMLElement) => void;
}
