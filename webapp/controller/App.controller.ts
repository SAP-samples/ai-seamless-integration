/* eslint-disable @typescript-eslint/no-unsafe-call */
import BaseController from "ai/integration/controller/BaseController";
import XMLView from "sap/ui/core/mvc/XMLView";
import JSONModel from "sap/ui/model/json/JSONModel";
import { PredefinedTextsData, PredefinedTexts} from "../model/types";

// UI5 Web Components
import Button from "@ui5/webcomponents/dist/Button";
import Dialog from "@ui5/webcomponents/dist/Dialog";
import Popover from "@ui5/webcomponents/dist/Popover";
import {ValueState} from "sap/ui/core/library";
import { ShellBar$NotificationsClickEvent } from "sap/ui/webc/fiori/ShellBar";
import Toast from "@ui5/webcomponents/dist/Toast";
import Menu from "@ui5/webcomponents/dist/Menu";
import AIButton$clickEvent from "@ui5/webcomponents-ai/dist/Button";
import WebCAIButton from "@ui5/webcomponents-ai/dist/Button";
import LanguageCode from "../model/LanguageCode";


/**
 * @namespace ai.integration.controller
 */
export default class App extends BaseController {
	TEXT_OBJECT_URL = "https://ui5.github.io/webcomponents/nightly/data/predefinedTexts.json";
	generationId: number;
	generationStopped: boolean = false;
	translationKey: string = LanguageCode.EN;
	currentTextKey: string;

	/**
	 * Called when the controller is instantiated.
	 */
	async onInit() {
		this.applyContentDensity();
		this.initViewModel();
	}

	/**
	 * Initializes the view model.
	 * This is used to set the initial state of the app.
	 */
	initViewModel(): void {
		const initialModelData = {
			outputValue: "",
			outputValueState: ValueState.None,
			outputEnabled: true,
			buttonState: "generate",
			sendButtonEnabled: true
		};

		const model = new JSONModel(initialModelData);
		const externalData = new JSONModel(this.TEXT_OBJECT_URL);

		this.getView().setModel(model, "appView");

		externalData.attachRequestCompleted(() => {
			if (externalData.getData()) {
				const currentModelState = model.getData();
				currentModelState.textObject = externalData.getData() as PredefinedTextsData;
				model.setData(currentModelState);
			}
		});
	}

	/**
	 * Applies the content density mode to the view.
	 */
	applyContentDensity(): void {
		this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
	}

	/**
	 * Called when opening the notifications popover.
	 */
	onNotificationsClick(e: ShellBar$NotificationsClickEvent): void {
		const view = this.getView().byId("notificationsView") as XMLView;
		const popover = view.byId("notificationsPopover").getDomRef() as Popover;

		e.preventDefault();
		popover.opener = e.getParameter("targetRef");
		popover.open = true;
	}

	onDialogOkButton(): void {
		const acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as Dialog;
		// @ts-expect-error: setOpen is not in the type but exists at runtime
		acknowledgementDialog.setOpen(false)
	}

	onDialogCancelButton(): void {
		const acknowledgementDialog = this.getView().byId("acknowledgementDialog") as unknown as Dialog;
		// @ts-expect-error: setOpen is not in the type but exists at runtime
		acknowledgementDialog.setOpen(false)
	}

	aiQuickPromptButtonClickHandler(): void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		const button = this.getView().byId("quickPromptButton") as unknown as WebCAIButton;
		const predefinedTexts = modelData.textObject.predefinedTexts;
		const menu = this.getView().byId("reviseMenu") as unknown as Menu;

		switch(modelData.buttonState) {
			case "":
			case "generate":
				modelData.buttonState = "generating";
				modelData.sendButtonEnabled = false;
				this.startQuickPromptGeneration();
				const keys = Object.keys(predefinedTexts[this.translationKey]);
				const randomKey = keys[Math.floor(Math.random() * keys.length)];
				this.currentTextKey = randomKey;
				this.generateText(predefinedTexts[this.translationKey][randomKey]);
				break;
			case "generating":
				modelData.buttonState = "revise";
				this.stopQuickPromptGeneration();
				break;
			case "revise":
				// @ts-expect-error: setOpener is not in the type but exists at runtime
				menu.setOpener(button.getDomRef() as HTMLElement);
				// @ts-expect-error: setOpen is not in the type but exists at runtime
				menu.setOpen(true);
				break;
			case "reviseGenerating":
				modelData.buttonState = "revise";
				this.stopQuickPromptGeneration();
				break;
		}
		model.updateBindings(true);
	}

	startQuickPromptGeneration(): void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		this.generationStopped = false;
		this.generationId = setTimeout(function() {
			modelData.buttonState = "revise";
			model.updateBindings(true);
		}, 2000);
	}

	generateText(text: string): void {
		if (this.generationId) {
			clearInterval(this.generationId);
		}

		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		modelData.outputEnabled = false;
		modelData.outputValue = "";
		model.updateBindings(true);

		const words = text.split(" ");
		let currentWordIndex = 0;

		this.generationId = setInterval(() => {
			if (currentWordIndex < words.length) {

				modelData.outputValue = `${modelData.outputValue}${words[currentWordIndex]} `;
				currentWordIndex++;
				modelData.sendButtonEnabled = false;
				modelData.outputEnabled = false;
			} else {
				if (!this.generationStopped) {
					modelData.buttonState = "revise";
				}
				clearInterval(this.generationId);
				modelData.sendButtonEnabled = true;
				modelData.outputEnabled = true;
			}
			model.updateBindings(true);
		}, 75);
	}

	stopQuickPromptGeneration(): void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		clearInterval(this.generationId);
		this.generationStopped = true;
		modelData.sendButtonEnabled = true;
		modelData.outputEnabled = true;
		model.updateBindings(true);
	}

	setStateAndGenerate(state: string, textKey: string, predefinedTexts: PredefinedTexts): void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		modelData.buttonState = state;
		model.updateBindings(true);
		this.startQuickPromptGeneration();
		this.generateText(predefinedTexts[this.translationKey][textKey]);
	}

	startTextGeneration(state: string, predefinedTexts: PredefinedTexts): void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		modelData.buttonState = state;
		model.updateBindings(true);
		this.startQuickPromptGeneration();
		this.generateText(predefinedTexts[this.translationKey][this.currentTextKey]);
	}

	clearValueState() : void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		modelData.outputValueState = ValueState.None;
		model.updateBindings(true);
	}

	setNegativeValueState() : void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		modelData.outputValueState = ValueState.Error;
		model.updateBindings(true);
	}

	fixSpellingAndGrammar(predefinedTexts: PredefinedTexts) : void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();

		if (this.isTextWrong(predefinedTexts)) {
			this.setStateAndGenerate("generating", this.currentTextKey, predefinedTexts);
			this.setNegativeValueState();
		} else {
			modelData.outputValueState = ValueState.Success;
			model.updateBindings(true);

			setTimeout(() => {
				modelData.outputValueState = ValueState.None;
				model.updateBindings(true);
			}, 3000);
		}
	}

	isTextWrong( predefinedTexts: PredefinedTexts) : boolean {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();
		const outputValue = modelData.outputValue;
		const textObject = modelData.textObject as PredefinedTextsData;

		const predefinedTextsBulleted = textObject.predefinedTextsBulleted;
		const predefinedTextsExpanded = textObject.predefinedTextsExpanded;
		const predefinedTextsRephrased = textObject.predefinedTextsRephrased;
		const predefinedTextsSimplified = textObject.predefinedTextsSimplified;

		return outputValue.trim() !== predefinedTexts[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsExpanded[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsBulleted[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsRephrased[this.translationKey][this.currentTextKey]
			&& outputValue.trim() !== predefinedTextsSimplified[this.translationKey][this.currentTextKey];
	}

	reviseMenuItemClickHandler(event: AIButton$clickEvent):void {
		const button = this.getView().byId("quickPromptButton") as unknown as WebCAIButton;
		const model = this.getView().getModel("appView") as JSONModel;
		const textObject = model.getData().textObject as PredefinedTextsData;

		const predefinedTexts = textObject.predefinedTexts;
		const predefinedTextsBulleted = textObject.predefinedTextsBulleted;
		const predefinedTextsExpanded = textObject.predefinedTextsExpanded;
		const predefinedTextsRephrased = textObject.predefinedTextsRephrased;
		const predefinedTextsSimplified = textObject.predefinedTextsSimplified;
		const predefinedTextsSummarized = textObject.predefinedTextsSummarized;

		switch (event.getParameter("text")) {
			case "Regenerate":
				const keys = Object.keys(predefinedTexts[this.translationKey]);
				const randomKey = keys[Math.floor(Math.random() * keys.length)];
				this.currentTextKey = randomKey;
				this.setStateAndGenerate("generating", randomKey, predefinedTexts);
				break;
			case "Make Bulleted List":
				this.startTextGeneration("reviseGenerating", predefinedTextsBulleted);
				break;
			case "Clear Error":
				this.clearValueState();
				break;
			case "Fix Spelling and Grammar":
				this.fixSpellingAndGrammar(predefinedTexts);
				break;
			case "Generate Error":
				this.setNegativeValueState();
				break;
			case "Simplify":
				this.startTextGeneration("reviseGenerating", predefinedTextsSimplified);
				break;
			case "Expand":
				this.startTextGeneration("reviseGenerating", predefinedTextsExpanded);
				break;
			case "Rephrase":
				this.startTextGeneration("reviseGenerating", predefinedTextsRephrased);
				break;
			case "Summarize":
				this.startTextGeneration("reviseGenerating", predefinedTextsSummarized);
				break;
			case "Bulgarian":
				this.translationKey = LanguageCode.BG;
				this.startTextGeneration("reviseGenerating", predefinedTexts);
				break;
			case "English":
				this.translationKey = LanguageCode.EN;
				this.startTextGeneration("reviseGenerating", predefinedTexts);
				break;
			case "German":
				this.translationKey = LanguageCode.DE;
				this.startTextGeneration("reviseGenerating", predefinedTexts);
				break;
		}
	}

	sendTextHandler():void {
		const model = this.getView().getModel("appView") as JSONModel;
		const modelData = model.getData();
		const toast = this.getView().byId("quickPromptToast") as unknown as Toast;

		if (modelData.outputValue) {
			// @ts-expect-error: setOpen is not in the type but exists at runtime
			toast.setOpen(true);

			modelData.outputValueState = ValueState.None;
			modelData.outputValue = "";
			model.updateBindings(true);
		}
	}

}
