import {ValueState} from "sap/ui/core/library";

interface RecipientToken {
	text: string;
}

interface ViewModelData {
	outputValue: string,
	outputValueState: ValueState,
	outputEnabled: boolean,
	outputLoading: boolean,
	outputCurrentVersion: number,
	outputTotalVersions: number,
	outputPromptDescription: string,
	buttonState: string,
	outputBusy: boolean,
	sendButtonEnabled: boolean,
	subject: string,
	recipients: RecipientToken[]
}

export {
	RecipientToken,
	ViewModelData
}