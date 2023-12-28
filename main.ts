import { syntaxTree } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { localization } from "localization";
import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";

interface TabKeyPluginSettings {
	activateOnlyOnCodeBlocks: boolean;
	indentsIfSelection: boolean;
	indentsIfSelectionOnlyForMultipleLines: boolean;
	useSpaces: boolean;
	alignSpaces: boolean;
	useHardSpace: boolean;
	spacesCount: number;
	allowException: boolean;
	exceptionRegex: string;
	obsidianTableEditor: boolean;
	useAdvancedTables: boolean;
	useOutlinerBetterTab: boolean;
	hotkey: string;
	language: string;
	developerMode: boolean;
}

const DEFAULT_SETTINGS: TabKeyPluginSettings = {
	activateOnlyOnCodeBlocks: false,
	indentsIfSelection: true,
	indentsIfSelectionOnlyForMultipleLines: true,
	useSpaces: false,
	alignSpaces: true,
	useHardSpace: false, // U+00A0 is technically not a space, let's not use it by default
	spacesCount: 4,
	allowException: true,
	exceptionRegex: "^[\\s\u{00A0}]*(-|\\d+\\.)( \\[ \\])?\\s*$",
	useAdvancedTables: false,
	obsidianTableEditor: true,
	useOutlinerBetterTab: true,
	hotkey: "Tab",
	language: "en-US",
	developerMode: false,
};

export default class TabKeyPlugin extends Plugin {
	settings: TabKeyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		let outlinerIndenting = false;

		this.registerEditorExtension(
			Prec.highest(
				keymap.of([
					{
						key: this.settings.hotkey,
						run: (): boolean => {
							if (this.settings.developerMode)
								console.log(
									"[restore tab] Tab key event triggered"
								);

							if (outlinerIndenting) {
								if (this.settings.developerMode)
									console.log(
										"[restore tab] Failed to execute: Outliner recursive call blocked"
									);
								return false;
							}
							const view =
								this.app.workspace.getActiveViewOfType(
									MarkdownView
								);
							if (!view) {
								if (this.settings.developerMode)
									console.log(
										"[restore tab] Failed to execute: Cannot get editor view"
									);
								return false;
							}
							const editor = view.editor;
							const sourceMode: boolean = view.getState().source;
							const token = this.getToken(editor.cm.state);

							if (this.settings.developerMode)
								console.log(
									"[restore tab] Current token: " + token
								);

							if (
								this.settings.activateOnlyOnCodeBlocks &&
								!token.startsWith("hmd-codeblock")
							) {
								if (this.settings.developerMode)
									console.log(
										"[restore tab] Did not execute: Not a code block"
									);

								return false; // When the command function returns `false`, further bindings will be tried for the key.
							}

							const cursorFrom = editor.getCursor("from");
							const cursorTo = editor.getCursor("to");
							const somethingSelected =
								cursorFrom.line != cursorTo.line ||
								cursorFrom.ch != cursorTo.ch;
							const app = this.app as any;

							if (
								this.settings.useOutlinerBetterTab &&
								RegExp("^[\\s]*(-|\\d+\\.)", "u").test(
									editor.getLine(cursorFrom.line)
								)
							) {
								const prevLine = editor.getLine(
									cursorFrom.line
								);
								outlinerIndenting = true;

								if (this.settings.developerMode)
									console.log(
										"[restore tab] Trying Outliner indent"
									);
								app.commands.executeCommandById(
									"obsidian-outliner:indent-list"
								);
								outlinerIndenting = false;
								if (
									prevLine != editor.getLine(cursorFrom.line)
								) {
									if (this.settings.developerMode)
										console.log(
											"[restore tab] Did not execute: Handled by Outliner"
										);
									// outliner probably did its thing
									return true;
								}
							}

							if (
								RegExp(`^\\|`, "u").test(
									editor.getLine(cursorFrom.line)
								)
							) {
								if (!sourceMode) {
									// live preview mode
									if (this.settings.developerMode)
										console.log(
											"[restore tab] Table environment in Live Preview mode"
										);

									if (this.settings.obsidianTableEditor) {
										// leave the editor alone
										if (this.settings.developerMode)
											console.log(
												"[restore tab] Did not execute: Handled by Obsidian Table Editor"
											);
										return false;
									}
								} else {
									// source mode
									if (this.settings.developerMode)
										console.log(
											"[restore tab] Table environment in Source mode"
										);

									if (this.settings.useAdvancedTables) {
										app.commands.executeCommandById(
											"table-editor-obsidian:next-cell"
										);
										if (this.settings.developerMode)
											console.log(
												"[restore tab] Did not execute: Handled by Advanced Table"
											);
										return true;
									}
								}
							}

							if (
								somethingSelected &&
								this.settings.indentsIfSelection &&
								(!this.settings
									.indentsIfSelectionOnlyForMultipleLines ||
									cursorTo.line != cursorFrom.line)
							) {
								editor.exec("indentMore");
								if (this.settings.developerMode)
									console.log("[restore tab] Indented");
							} else {
								const cursorFrom = editor.getCursor("from");
								const tabStr = this.settings.useSpaces
									? (this.settings.useHardSpace
											? " "
											: " "
									  ).repeat(
											this.settings.alignSpaces
												? this.settings.spacesCount -
														(cursorFrom.ch %
															this.settings
																.spacesCount)
												: this.settings.spacesCount
									  )
									: "\t";

								if (
									!somethingSelected &&
									this.settings.allowException
								) {
									if (
										RegExp(
											this.settings.exceptionRegex,
											"u"
										).test(editor.getLine(cursorFrom.line))
									) {
										editor.exec("indentMore");
										if (this.settings.developerMode)
											console.log(
												"[restore tab] Indented (regex exception)"
											);
										return true;
									}
								}

								// insert tab
								editor.replaceSelection(tabStr);
								editor.setCursor({
									line: cursorFrom.line,
									ch: cursorFrom.ch + tabStr.length,
								});
								if (this.settings.developerMode)
									console.log("[restore tab] Tab inserted");
							}
							return true;
						},
						preventDefault: false, // always preventDefault
					},
				])
			)
		);
	}

	getToken = (state: EditorState) => {
		const ast = syntaxTree(state);
		return ast.resolveInner(state.selection.main.head, -1).type
			.name as string;
	};

	createKeymapRunCallback() {
		return (view: EditorView): boolean => {
			return true;
		};
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: TabKeyPlugin;

	constructor(app: App, plugin: TabKeyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h3", {
			text: localization["title"][this.plugin.settings.language],
		});
		containerEl.createEl("i", {
			text: localization["description"][this.plugin.settings.language],
		});
		containerEl.createEl("br");
		containerEl.createEl("br");

		new Setting(containerEl)
			.setName(localization["language"][this.plugin.settings.language])
			.setDesc(
				localization["languageDesc"][this.plugin.settings.language]
			)
			.addDropdown((toggle) =>
				toggle
					.addOptions({
						"en-US": "English (US)",
						"zh-CN": "简体中文",
						"zh-TW": "繁體中文",
					})
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
						this.display(); // refresh display
					})
			);

		containerEl.createEl("h5", {
			text: localization["tabOrSpace"][this.plugin.settings.language],
		});

		new Setting(containerEl)
			.setName(
				localization["useSpacesInsteadOfTab"][
					this.plugin.settings.language
				]
			)
			.setDesc(
				localization["useSpacesInsteadOfTabDesc"][
					this.plugin.settings.language
				]
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useSpaces)
					.onChange(async (value) => {
						this.plugin.settings.useSpaces = value;
						this.display(); // refresh display
						await this.plugin.saveSettings();
					})
			);

		if (this.plugin.settings.useSpaces) {
			new Setting(containerEl)
				.setName(
					localization["spaceCount"][this.plugin.settings.language]
				)
				.setDesc(
					localization["spaceCountDesc"][
						this.plugin.settings.language
					]
				)
				.addSlider((slider) =>
					slider
						.setValue(this.plugin.settings.spacesCount)
						.setLimits(2, 8, 1)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.spacesCount = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(
					localization["alignSpaces"][this.plugin.settings.language]
				)
				.setDesc(
					localization["alignSpacesDesc"][
						this.plugin.settings.language
					]
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.alignSpaces)
						.onChange(async (value) => {
							this.plugin.settings.alignSpaces = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(
					localization["useHardSpaces"][this.plugin.settings.language]
				)
				.setDesc(
					localization["useHardSpacesDesc"][
						this.plugin.settings.language
					]
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.useHardSpace)
						.onChange(async (value) => {
							this.plugin.settings.useHardSpace = value;
							await this.plugin.saveSettings();
						})
				);
		}

		containerEl.createEl("h5", {
			text: localization["tabKeyBehavior"][this.plugin.settings.language],
		});

		new Setting(containerEl)
			.setName(
				localization["indentWhenSelectionNotEmpty"][
					this.plugin.settings.language
				]
			)
			.setDesc(
				localization["indentWhenSelectionNotEmptyDesc"][
					this.plugin.settings.language
				]
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.indentsIfSelection)
					.onChange(async (value) => {
						this.plugin.settings.indentsIfSelection = value;
						await this.plugin.saveSettings();
					})
			);

		if (this.plugin.settings.indentsIfSelection) {
			new Setting(containerEl)
				.setName(
					localization["indentOnlySelectionMultipleLine"][
						this.plugin.settings.language
					]
				)
				.setDesc(
					localization["indentOnlySelectionMultipleLineDesc"][
						this.plugin.settings.language
					]
				)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings
								.indentsIfSelectionOnlyForMultipleLines
						)
						.onChange(async (value) => {
							this.plugin.settings.indentsIfSelectionOnlyForMultipleLines =
								value;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName(
				localization["onlyInCodeBlocks"][this.plugin.settings.language]
			)
			.setDesc(
				localization["onlyInCodeBlocksDesc"][
					this.plugin.settings.language
				]
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.activateOnlyOnCodeBlocks)
					.onChange(async (value) => {
						this.plugin.settings.activateOnlyOnCodeBlocks = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(
				localization["allowException"][this.plugin.settings.language]
			)
			.setDesc(
				localization["allowExceptionDesc"][
					this.plugin.settings.language
				]
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.allowException)
					.onChange(async (value) => {
						this.plugin.settings.allowException = value;
						this.display(); // refresh display
						await this.plugin.saveSettings();
					})
			);
		if (this.plugin.settings.allowException) {
			new Setting(containerEl)
				.setName(
					localization["exceptionRegex"][
						this.plugin.settings.language
					]
				)
				.setDesc(
					localization["exceptionRegexDesc"][
						this.plugin.settings.language
					]
				)
				.addText((textbox) =>
					textbox
						.setValue(this.plugin.settings.exceptionRegex)
						.setPlaceholder("Regex")
						.onChange(async (value) => {
							this.plugin.settings.exceptionRegex = value;
							await this.plugin.saveSettings();
						})
				)
				.addExtraButton((button) =>
					button.setIcon("rotate-ccw").onClick(async () => {
						this.plugin.settings.exceptionRegex =
							"^[\\s\u{00A0}]*(-|\\d+\\.)( \\[ \\])?\\s*$";
						this.display();
						await this.plugin.saveSettings();
					})
				);
		}

		containerEl.createEl("h5", {
			text: localization["pluginCompatibility"][
				this.plugin.settings.language
			],
		});

		new Setting(containerEl)
			.setName(
				localization["obsidianTableEditor"][
					this.plugin.settings.language
				]
			)
			.setDesc(
				localization["obsidianTableEditorDesc"][
					this.plugin.settings.language
				]
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.obsidianTableEditor)
					.onChange(async (value) => {
						this.plugin.settings.obsidianTableEditor = value;
						await this.plugin.saveSettings();
					})
			);

		if (this.plugin.settings.developerMode) {
			new Setting(containerEl)
				.setName(
					localization["advancedTables"][
						this.plugin.settings.language
					]
				)
				.setDesc(
					localization["advancedTablesDesc"][
						this.plugin.settings.language
					]
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.useAdvancedTables)
						.onChange(async (value) => {
							this.plugin.settings.useAdvancedTables = value;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName(localization["outliner"][this.plugin.settings.language])
			.setDesc(
				localization["outlinerDesc"][this.plugin.settings.language]
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useOutlinerBetterTab)
					.onChange(async (value) => {
						this.plugin.settings.useOutlinerBetterTab = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h5", {
			text: localization["additional"][this.plugin.settings.language],
		});

		new Setting(containerEl)
			.setName(
				localization["customHotkey"][this.plugin.settings.language]
			)
			.setDesc(
				localization["customHotkeyDesc"][this.plugin.settings.language]
			)
			.addText((textbox) =>
				textbox
					.setValue(this.plugin.settings.hotkey)
					.setPlaceholder("Ctrl-Alt-Space")
					.onChange(async (value) => {
						this.plugin.settings.hotkey = value;
						await this.plugin.saveSettings();
					})
			)
			.addExtraButton((button) =>
				button.setIcon("rotate-ccw").onClick(async () => {
					this.plugin.settings.hotkey = "Tab";
					this.display(); // refresh display
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(
				localization["developerMode"][this.plugin.settings.language]
			)
			.setDesc(
				localization["developerModeDesc"][this.plugin.settings.language]
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.developerMode)
					.onChange(async (value) => {
						this.plugin.settings.developerMode = value;
						this.display(); // refresh display
						await this.plugin.saveSettings();
					})
			);
	}
}
