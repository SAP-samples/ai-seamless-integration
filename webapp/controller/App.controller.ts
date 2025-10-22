/* eslint-disable @typescript-eslint/no-unsafe-call */
import BaseController from "ai/integration/controller/BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import { PredefinedTextsData, PredefinedTexts, ViewModelData} from "../model/types";

// UI5 Web Components
import type Dialog from "@ui5/webcomponents/dist/Dialog";
import {ValueState} from "sap/ui/core/library";
import type Toast from "@ui5/webcomponents/dist/Toast";
import type Menu from "@ui5/webcomponents/dist/Menu";
import AIButton$clickEvent from "@ui5/webcomponents-ai/dist/Button";
import type WebCAIButton from "@ui5/webcomponents-ai/dist/Button";
import LanguageCode from "../model/LanguageCode";


/**
 * @namespace ai.integration.controller
 */
export default class App extends BaseController {
	TEXT_OBJECT_URL = "https://ui5.github.io/webcomponents/nightly/data/predefinedTexts.json";
	viewModel: JSONModel;
	viewModelData: ViewModelData;
	textObject: PredefinedTextsData;
	generationId: number;
	generationStopped: boolean = false;
	translationKey: string = LanguageCode.EN;
	currentTextKey: string;

	/**
	 * Called when the controller is instantiated.
	 */
	onInit() {
		this.applyContentDensity();
		this.initViewModel();
	}

	/**
	 * Initializes the view model.
	 * This is used to set the initial state of the app.
	 */
	async initViewModel(): Promise<void> {
		const initialModelData = {
			outputValue: "",
			outputValueState: ValueState.None,
			outputEnabled: true,
			buttonState: "generate",
			outputBusy: false,
			sendButtonEnabled: true
		} as ViewModelData;

		const model = new JSONModel(initialModelData);
		const externalData = new JSONModel();

		await externalData.loadData(this.TEXT_OBJECT_URL);

		this.getView().setModel(model, "appView");
		this.getView().setModel(externalData, "externalData");

		this.viewModel = model;
		this.textObject = externalData.getData() as PredefinedTextsData;

		this.viewModelData = this.viewModel.getData() as ViewModelData;
	}

	/**
	 * Applies the content density mode to the view.
	 */
	applyContentDensity(): void {
		this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
	}

	onDialogOkButton(): void {
		const acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as Dialog;
		acknowledgementDialog.setOpen(false);
	}

	onDialogCancelButton(): void {
		const acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as Dialog;
		acknowledgementDialog.setOpen(false);
	}

	aiQuickPromptButtonClickHandler(): void {
		const button = this.getView().byId("quickPromptButton") as unknown as WebCAIButton;
		const predefinedTexts = this.textObject.predefinedTexts;
		const menu = this.getView().byId("reviseMenu") as unknown as Menu;

		switch(this.viewModelData.buttonState) {
			case "":
			case "generate":
				this.viewModelData.buttonState = "generating";
				this.viewModelData.outputBusy = true;
				this.viewModelData.sendButtonEnabled = false;
				this.startQuickPromptGeneration();
				const keys = Object.keys(predefinedTexts[this.translationKey]);
				const randomKey = keys[Math.floor(Math.random() * keys.length)];
				this.currentTextKey = randomKey;
				this.viewModel.updateBindings(true);
				this.startLoadingProcess(this.generateText, predefinedTexts[this.translationKey][randomKey] )
				break;
			case "generating":
				this.viewModelData.buttonState = "revise";
				this.stopQuickPromptGeneration();
				break;
			case "revise":

				menu.setOpener(button.getId());
				menu.setOpen(true);
				break;
			case "reviseGenerating":
				this.viewModelData.buttonState = "revise";
				this.stopQuickPromptGeneration();
				break;
		}
		this.viewModel.updateBindings(true);
	}

	startQuickPromptGeneration(): void {
		this.generationStopped = false;
		this.generationId = setTimeout(()=> {
			this.viewModelData.buttonState = "revise";
			this.viewModel.updateBindings(true);
		}, 2000);
	}

	generateText(text: string): void {
		if (this.generationId) {
			clearInterval(this.generationId);
		}

		this.viewModelData.outputEnabled = false;
		this.viewModelData.outputValue = "";
		this.viewModel.updateBindings(true);

		const words = text.split("");
		let currentWordIndex = 0;

		this.generationId = setInterval(() => {
			if (currentWordIndex < words.length) {
				this.viewModelData.outputValue = `${this.viewModelData.outputValue}${words[currentWordIndex]}`;
				currentWordIndex++;
				this.viewModelData.sendButtonEnabled = false;
				this.viewModelData.outputEnabled = false;
			} else {
				if (!this.generationStopped) {
					this.viewModelData.buttonState = "revise";
				}
				clearInterval(this.generationId);
				this.viewModelData.sendButtonEnabled = true;
				this.viewModelData.outputEnabled = true;
			}
			this.viewModel.updateBindings(true);
		}, 15);
	}

	stopQuickPromptGeneration(): void {

		clearInterval(this.generationId);
		this.generationStopped = true;
		this.viewModelData.sendButtonEnabled = true;
		this.viewModelData.outputEnabled = true;
		this.viewModel.updateBindings(true);
	}

	setStateAndGenerate(state: string, textKey: string, predefinedTexts: PredefinedTexts): void {
		this.viewModelData.buttonState = state;
		this.viewModel.updateBindings(true);
		this.startQuickPromptGeneration();
		this.generateText(predefinedTexts[this.translationKey][textKey]);
	}

	startTextGeneration(state: string, predefinedTexts: PredefinedTexts): void {
		this.viewModelData.buttonState = state;
		this.viewModel.updateBindings(true);
		this.startQuickPromptGeneration();
		this.generateText(predefinedTexts[this.translationKey][this.currentTextKey]);
	}

	clearValueState() : void {
		this.viewModelData.outputValueState = ValueState.None;
		this.viewModel.updateBindings(true);
	}

	setNegativeValueState() : void {
		this.viewModelData.outputValueState = ValueState.Error;
		this.viewModel.updateBindings(true);
	}

	fixSpellingAndGrammar(predefinedTexts: PredefinedTexts) : void {
		if (this.isTextWrong(predefinedTexts)) {
			this.setStateAndGenerate("generating", this.currentTextKey, predefinedTexts);
			this.setNegativeValueState();
		} else {
			this.viewModelData.outputValueState = ValueState.Success;
			this.viewModel.updateBindings(true);

			setTimeout(() => {
				this.viewModelData.outputValueState = ValueState.None;
				this.viewModel.updateBindings(true);
			}, 3000);
		}
	}

	isTextWrong( predefinedTexts: PredefinedTexts) : boolean {
		const outputValue = this.viewModelData.outputValue;

		const predefinedTextsBulleted = this.textObject.predefinedTextsBulleted;
		const predefinedTextsExpanded = this.textObject.predefinedTextsExpanded;
		const predefinedTextsRephrased = this.textObject.predefinedTextsRephrased;
		const predefinedTextsSimplified = this.textObject.predefinedTextsSimplified;

		return outputValue.trim() !== predefinedTexts[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsExpanded[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsBulleted[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsRephrased[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsSimplified[this.translationKey][this.currentTextKey];
	}

	reviseMenuItemClickHandler(event: AIButton$clickEvent):void {
		const predefinedTexts = this.textObject.predefinedTexts;
		const predefinedTextsBulleted = this.textObject.predefinedTextsBulleted;
		const predefinedTextsExpanded = this.textObject.predefinedTextsExpanded;
		const predefinedTextsRephrased = this.textObject.predefinedTextsRephrased;
		const predefinedTextsSimplified = this.textObject.predefinedTextsSimplified;
		const predefinedTextsSummarized = this.textObject.predefinedTextsSummarized;

		this.viewModelData.outputBusy = true;
		this.viewModel.updateBindings(true);

		switch (event.getParameter("text")) {
			case "Regenerate":
				const keys = Object.keys(predefinedTexts[this.translationKey]);
				const randomKey = keys[Math.floor(Math.random() * keys.length)];
				this.currentTextKey = randomKey;
				this.startLoadingProcess(this.setStateAndGenerate, "generating", randomKey, predefinedTexts);
				break;
			case "Make Bulleted List":
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTextsBulleted);
				break;
			case "Clear Error":
				this.viewModelData.outputBusy = false;
				this.viewModel.updateBindings(true);
				this.clearValueState();
				break;
			case "Fix Spelling and Grammar":
				this.startLoadingProcess(this.fixSpellingAndGrammar, predefinedTexts);
				break;
			case "Generate Error":
				this.viewModelData.outputBusy = false;
				this.viewModel.updateBindings(true);
				this.setNegativeValueState();
				break;
			case "Simplify":
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTextsSimplified);
				break;
			case "Expand":
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTextsExpanded);
				break;
			case "Rephrase":
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTextsRephrased);
				break;
			case "Summarize":
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTextsSummarized);
				break;
			case "Bulgarian":
				this.translationKey = LanguageCode.BG;
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTexts);
				break;
			case "English":
				this.translationKey = LanguageCode.EN;
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTexts);
				break;
			case "German":
				this.translationKey = LanguageCode.DE;
				this.startLoadingProcess(this.startTextGeneration, "reviseGenerating", predefinedTexts);
				break;
		}
	}

	startLoadingProcess<TArgs extends unknown[]>(callback: (...args: TArgs)=> void, ...args: TArgs){
		setTimeout(()=> {
			callback.call(this, ...args);
			this.viewModelData.outputBusy = false;
			this.viewModel.updateBindings(true);
		}, 1000);
	}

	sendTextHandler():void {
		const toast = this.getView().byId("quickPromptToast") as unknown as Toast;

		if (this.viewModelData.outputValue) {
			toast.setOpen(true);

			this.viewModelData.outputValueState = ValueState.None;
			this.viewModelData.outputValue = "";
			this.viewModel.updateBindings(true);
		}
	}

}
