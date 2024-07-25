import { syntaxTree } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { localization } from "localization";
import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";

interface TabKeyPluginSettings {
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

	enableBracesAutoIndent: boolean;
	braceCodeSetOpen: string;
	braceCodeSetClose: string;
	braceMarkdownSetOpen: string;
	braceMarkdownSetClose: string;
	indentCharacters: string;

	activateInCodeBlocks: boolean;
	activateInLists: boolean;
	activateInTables: boolean;
	activateInInlineCode: boolean;
	activateInOthers: boolean;
}

const DEFAULT_SETTINGS: TabKeyPluginSettings = {
	indentsIfSelection: true,
	indentsIfSelectionOnlyForMultipleLines: true,
	useSpaces: false,
	alignSpaces: true,
	useHardSpace: false, // U+00A0 is technically not a space, let's not use it by default
	spacesCount: 4,
	allowException: false,
	exceptionRegex: "^[\\s\u{00A0}]*(-|\\d+\\.)( \\[ \\])?\\s*$",
	useAdvancedTables: false,
	obsidianTableEditor: true,
	useOutlinerBetterTab: true,
	hotkey: "Tab",
	language: "auto",
	developerMode: false,

	enableBracesAutoIndent: true,
	braceCodeSetOpen: '["\\\\{$", "\\\\[$", "\\\\($", "\\"$", "\'$", "`$"]',
	braceCodeSetClose: '["^\\\\}", "^\\\\]", "^\\\\)", "^\\"", "^\'", "^`"]',
	braceMarkdownSetOpen: '["\\\\{$", "\\\\[$", "\\\\($", "\\"$", "\'$", "\\\\$\\\\$$", "<.+>$", "¡$", "¿$"]',
	braceMarkdownSetClose: '["^\\\\}", "^\\\\]", "^\\\\)", "^\\"", "^\'", "^\\\\$\\\\$", "^<\\\\/\\\\w+>", "^!", "^?"]',
	indentCharacters: " \t",

	activateInCodeBlocks: true,
	activateInLists: false,
	activateInTables: false,
	activateInInlineCode: false,
	activateInOthers: false,
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
							this.log("Tab key event triggered");

							if (outlinerIndenting) {
								this.log("Failed to execute: Outliner recursive call blocked");
								return false;
							}
							const view = this.app.workspace.getActiveViewOfType(MarkdownView);
							if (!view) {
								this.log("Failed to execute: Cannot get editor view");
								return false;
							}

							const editor = view.editor;
							const sourceMode: boolean = view.getState().source;
							//@ts-expect-error cm is not defined in the type docs
							const token = this.getToken(editor.cm.state);

							this.log("Current token: " + token);

							if (token.includes("inline-code")) {
								// inline-code will take precedence, if an inline code is in a list, for example
								if (!this.settings.activateInInlineCode) {
									this.log("Did not execute: Inline code environment not activated");
									return false; // When the command function returns `false`, further bindings will be tried for the key.
								}
							} else if (token.includes("hmd-codeblock")) {
								if (!this.settings.activateInCodeBlocks) {
									this.log("Did not execute: Code block environment not activated");
									return false; // When the command function returns `false`, further bindings will be tried for the key.
								}
							} else if (token.includes("list-1")) {
								if (!this.settings.activateInLists) {
									this.log("Did not execute: List environment not activated");
									return false; // When the command function returns `false`, further bindings will be tried for the key.
								}
							} else if (!token.includes("table")) {
								if (!this.settings.activateInOthers) {
									this.log("Did not execute: Other environments not activated");
									return false; // When the command function returns `false`, further bindings will be tried for the key.
								}
							}

							const cursorFrom = editor.getCursor("from");
							const cursorTo = editor.getCursor("to");
							const somethingSelected = cursorFrom.line != cursorTo.line || cursorFrom.ch != cursorTo.ch;
							const app = this.app as any;

							if (
								this.settings.useOutlinerBetterTab &&
								RegExp("^[\\s]*(-|\\d+\\.)", "u").test(editor.getLine(cursorFrom.line))
							) {
								const prevLine = editor.getLine(cursorFrom.line);
								outlinerIndenting = true;

								this.log("Trying Outliner indent");
								app.commands.executeCommandById("obsidian-outliner:indent-list");
								outlinerIndenting = false;
								if (prevLine != editor.getLine(cursorFrom.line)) {
									this.log("Did not execute: Handled by Outliner");
									// outliner probably did its thing
									return true;
								}
							}

							if (RegExp(`^ *\\|`, "u").test(editor.getLine(cursorFrom.line))) {
								if (!this.settings.activateInTables) {
									if (!sourceMode) {
										// live preview mode
										this.log("Table environment in Live Preview mode");

										if (this.settings.obsidianTableEditor) {
											// leave the editor alone
											this.log("Did not execute: Handled by Obsidian Table Editor");
											return false;
										}
									} else {
										// source mode
										this.log("Table environment in Source mode");

										if (this.settings.useAdvancedTables) {
											app.commands.executeCommandById("table-editor-obsidian:next-cell");
											this.log("Did not execute: Handled by Advanced Table");
											return true;
										}
									}
								}
							}

							if (
								somethingSelected &&
								this.settings.indentsIfSelection &&
								(!this.settings.indentsIfSelectionOnlyForMultipleLines ||
									cursorTo.line != cursorFrom.line)
							) {
								editor.exec("indentMore");
								this.log("Indented");
							} else {
								const cursorFrom = editor.getCursor("from");
								const tabStr = this.settings.useSpaces
									? (this.settings.useHardSpace ? " " : " ").repeat(
											this.settings.alignSpaces
												? this.settings.spacesCount -
														(cursorFrom.ch % this.settings.spacesCount)
												: this.settings.spacesCount
									  )
									: "\t";

								if (!somethingSelected && this.settings.allowException) {
									if (
										RegExp(this.settings.exceptionRegex, "u").test(editor.getLine(cursorFrom.line))
									) {
										editor.exec("indentMore");
										this.log("Indented (regex exception)");
										return true;
									}
								}

								// insert tab
								editor.replaceSelection(tabStr);
								editor.setCursor({
									line: cursorFrom.line,
									ch: cursorFrom.ch + tabStr.length,
								});
								this.log("Tab inserted");
							}
							return true;
						},
						preventDefault: false, // always preventDefault?
					},
					{
						key: "Enter",
						run: (): boolean => {
							this.log("Enter key event triggered");

							if (!this.settings.enableBracesAutoIndent) return false; // return the enter event

							const view = this.app.workspace.getActiveViewOfType(MarkdownView);
							if (!view) {
								this.log("Failed to execute: Cannot get editor view");
								return false;
							}

							const editor = view.editor;
							if (
								editor.getCursor("from").line != editor.getCursor("to").line ||
								editor.getCursor("from").ch != editor.getCursor("to").ch
							)
								return false;

							const cursor = editor.getCursor("from");
							const line = editor.getLine(cursor.line);

							//@ts-expect-error cm is not defined in the type docs
							const token = this.getToken(editor.cm.state);

							if (this.settings.developerMode) {
								this.log("Current token: " + token);
								this.log(
									"which is" +
										(token.includes("hmd-codeblock") ? " " : " not ") +
										"a code block, matching regexes for " +
										(token.includes("hmd-codeblock") ? "code" : "markdown")
								);
							}

							let braceDetected = false;
							const bracesOpen = JSON.parse(
								token.includes("hmd-codeblock")
									? this.settings.braceCodeSetOpen
									: this.settings.braceMarkdownSetOpen
							);
							const bracesClose = JSON.parse(
								token.includes("hmd-codeblock")
									? this.settings.braceCodeSetClose
									: this.settings.braceMarkdownSetClose
							);

							const pairs = Math.min(bracesOpen.length, bracesClose.length);
							this.log("there are " + pairs + " pairs of braces defined");

							for (let i = 0; i < pairs; i++) {
								this.log("matching regex " + bracesOpen[i] + " and " + bracesClose[i]);
								if (
									RegExp(bracesOpen[i], "u").test(line.substring(0, cursor.ch)) &&
									RegExp(bracesClose[i], "u").test(line.substring(cursor.ch))
								) {
									braceDetected = true;
									break;
								}
							}

							if (braceDetected) {
								this.log("Code Auto Indent: Brace detected");

								let indentPrefixLen = 0;
								while (this.settings.indentCharacters.includes(line[indentPrefixLen]))
									indentPrefixLen++;
								editor.exec("newlineAndIndent"); // do the "entering" (it doesn't actually indent, for some reason...)

								if (cursor.ch == line.length) {
									this.log("Pressed enter without closing pair to the right of the cursor");
								} else if (
									editor.getLine(cursor.line + 1).length &&
									!this.settings.indentCharacters.includes(
										editor
											.getLine(cursor.line + 1)
											.charAt(editor.getLine(cursor.line + 1).length - 1) // last character is not whitespace
									)
								) {
									this.log(
										"Closing pair or whatever was to the right of the cursor is still here, entering one more time"
									);
									editor.exec("newlineAndIndent");
								} else {
									this.log("Closing pair was automatically moved one extra line down");
								}

								editor.setLine(cursor.line + 1, line.substring(0, indentPrefixLen)); // existing indentation
								if (line.substring(cursor.ch)) {
									// has suffix
									editor.setLine(
										cursor.line + 2,
										line.substring(0, indentPrefixLen) + line.substring(cursor.ch)
									); // existing indentation + suffix
								}
								editor.setCursor(cursor.line + 1, editor.getLine(cursor.line + 1).length);
								editor.exec("indentMore"); // indent this line
								editor.setCursor(cursor.line + 1, editor.getLine(cursor.line + 1).length);

								return true; // don't "enter" again
							}

							return false; // enter like normal
						},
					},
				])
			)
		);
	}

	// Taken from the Obsidian Tabout plugin. No way I figure this out myself, this is AWESOME!!!
	getToken = (state: EditorState) => {
		const ast = syntaxTree(state);
		return ast.resolveInner(state.selection.main.head, -1).type.name as string;
	};

	log = (msg: string) => {
		if (this.settings.developerMode) console.log("[restore tab] " + msg);
	};

	createKeymapRunCallback() {
		return (view: EditorView): boolean => {
			return true;
		};
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
		// load user app language setting
		const appLang = window.localStorage.getItem("language");
		this.plugin.log("Detected application language: " + appLang + (appLang == null ? " (aka English)" : ""));

		const lang =
			this.plugin.settings.language == "auto"
				? appLang == "zh-TW"
					? "zh-TW"
					: appLang == "zh"
					? "zh-CN"
					: "en-US"
				: this.plugin.settings.language;

		this.plugin.log("Using localization: " + lang);

		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h3", {
			text: localization["title"][lang],
		});
		containerEl.createEl("i", {
			text: localization["description"][lang],
		});
		containerEl.createEl("br");
		containerEl.createEl("br");

		new Setting(containerEl)
			.setName(localization["language"][lang])
			.setDesc(localization["languageDesc"][lang])
			.addDropdown((toggle) =>
				toggle
					.addOptions({
						auto: localization["auto"][lang],
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
			text: localization["tabOrSpace"][lang],
		});

		new Setting(containerEl)
			.setName(localization["useSpacesInsteadOfTab"][lang])
			.setDesc(localization["useSpacesInsteadOfTabDesc"][lang])
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useSpaces).onChange(async (value) => {
					this.plugin.settings.useSpaces = value;
					this.display(); // refresh display
					await this.plugin.saveSettings();
				})
			);

		if (this.plugin.settings.useSpaces) {
			new Setting(containerEl)
				.setName(localization["spaceCount"][lang])
				.setDesc(localization["spaceCountDesc"][lang])
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
				.setName(localization["alignSpaces"][lang])
				.setDesc(localization["alignSpacesDesc"][lang])
				.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.alignSpaces).onChange(async (value) => {
						this.plugin.settings.alignSpaces = value;
						await this.plugin.saveSettings();
					})
				);

			new Setting(containerEl)
				.setName(localization["useHardSpaces"][lang])
				.setDesc(localization["useHardSpacesDesc"][lang])
				.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.useHardSpace).onChange(async (value) => {
						this.plugin.settings.useHardSpace = value;
						await this.plugin.saveSettings();
					})
				);
		}

		containerEl.createEl("h5", {
			text: localization["tabKeyBehavior"][lang],
		});

		new Setting(containerEl)
			.setName(localization["activateIn"][lang])
			.setDesc(localization["activateInDesc"][lang]);
		new Setting(containerEl).setName("    " + localization["activateInCodeBlocks"][lang]).addToggle((toggle) =>
			toggle.setValue(this.plugin.settings.activateInCodeBlocks).onChange(async (value) => {
				this.plugin.settings.activateInCodeBlocks = value;
				await this.plugin.saveSettings();
			})
		);
		new Setting(containerEl).setName("    " + localization["activateInLists"][lang]).addToggle((toggle) =>
			toggle.setValue(this.plugin.settings.activateInLists).onChange(async (value) => {
				this.plugin.settings.activateInLists = value;
				await this.plugin.saveSettings();
			})
		);
		new Setting(containerEl).setName("    " + localization["activateInTables"][lang]).addToggle((toggle) =>
			toggle.setValue(this.plugin.settings.activateInTables).onChange(async (value) => {
				this.plugin.settings.activateInTables = value;
				await this.plugin.saveSettings();
			})
		);
		new Setting(containerEl).setName("    " + localization["activateInInlineCode"][lang]).addToggle((toggle) =>
			toggle.setValue(this.plugin.settings.activateInInlineCode).onChange(async (value) => {
				this.plugin.settings.activateInInlineCode = value;
				await this.plugin.saveSettings();
			})
		);
		new Setting(containerEl).setName("    " + localization["activateInOthers"][lang]).addToggle((toggle) =>
			toggle.setValue(this.plugin.settings.activateInOthers).onChange(async (value) => {
				this.plugin.settings.activateInOthers = value;
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
			.setName(localization["indentWhenSelectionNotEmpty"][lang])
			.setDesc(localization["indentWhenSelectionNotEmptyDesc"][lang])
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.indentsIfSelection).onChange(async (value) => {
					this.plugin.settings.indentsIfSelection = value;
					this.display(); // refresh display
					await this.plugin.saveSettings();
				})
			);

		if (this.plugin.settings.indentsIfSelection) {
			new Setting(containerEl)
				.setName(localization["indentOnlySelectionMultipleLine"][lang])
				.setDesc(localization["indentOnlySelectionMultipleLineDesc"][lang])
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.indentsIfSelectionOnlyForMultipleLines)
						.onChange(async (value) => {
							this.plugin.settings.indentsIfSelectionOnlyForMultipleLines = value;
							await this.plugin.saveSettings();
						})
				);
		}

		if (this.plugin.settings.developerMode) {
			new Setting(containerEl)
				.setName(localization["allowException"][lang])
				.setDesc(localization["allowExceptionDesc"][lang])
				.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.allowException).onChange(async (value) => {
						this.plugin.settings.allowException = value;
						this.display(); // refresh display
						await this.plugin.saveSettings();
					})
				);
			if (this.plugin.settings.allowException) {
				new Setting(containerEl)
					.setName(localization["exceptionRegex"][lang])
					.setDesc(localization["exceptionRegexDesc"][lang])
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
						button
							.setIcon("rotate-ccw")
							.setTooltip(localization["extraButtonRestore"][lang])
							.onClick(async () => {
								this.plugin.settings.exceptionRegex = DEFAULT_SETTINGS.exceptionRegex;
								this.display();
								await this.plugin.saveSettings();
							})
					);
			}
		}

		containerEl.createEl("h5", {
			text: localization["bracesAutoIndent"][lang],
		});

		new Setting(containerEl)
			.setName(localization["enableBracesAutoIndent"][lang])
			.setDesc(localization["enableBracesAutoIndentDesc"][lang])
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableBracesAutoIndent).onChange(async (value) => {
					this.plugin.settings.enableBracesAutoIndent = value;
					this.display(); // refresh display
					await this.plugin.saveSettings();
				})
			);

		if (this.plugin.settings.enableBracesAutoIndent) {
			new Setting(containerEl)
				.setName(localization["braceSetCode"][lang])
				.setDesc(localization["braceSetCodeDesc"][lang])
				.addTextArea((textbox) =>
					textbox
						.setValue(this.plugin.settings.braceCodeSetOpen)
						.setPlaceholder("json array of regexes")
						.onChange(async (value) => {
							this.plugin.settings.braceCodeSetOpen = value;
							await this.plugin.saveSettings();
						})
				)
				.addTextArea((textbox) =>
					textbox
						.setValue(this.plugin.settings.braceCodeSetClose)
						.setPlaceholder("json array of regexes")
						.onChange(async (value) => {
							this.plugin.settings.braceCodeSetClose = value;
							await this.plugin.saveSettings();
						})
				)
				.addExtraButton((button) =>
					button
						.setIcon("rotate-ccw")
						.setTooltip(localization["extraButtonRestore"][lang])
						.onClick(async () => {
							this.plugin.settings.braceCodeSetOpen = DEFAULT_SETTINGS.braceCodeSetOpen;
							this.plugin.settings.braceCodeSetClose = DEFAULT_SETTINGS.braceCodeSetClose;
							this.display();
							await this.plugin.saveSettings();
						})
				)
				.addExtraButton((button) =>
					button
						.setIcon("ban")
						.setTooltip(localization["extraButtonDisable"][lang])
						.onClick(async () => {
							this.plugin.settings.braceCodeSetOpen = "[]";
							this.plugin.settings.braceCodeSetClose = "[]";
							this.display();
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(localization["braceSetMarkdown"][lang])
				.setDesc(localization["braceSetMarkdownDesc"][lang])
				.addTextArea((textbox) =>
					textbox
						.setValue(this.plugin.settings.braceMarkdownSetOpen)
						.setPlaceholder("json array of regexes")
						.onChange(async (value) => {
							this.plugin.settings.braceMarkdownSetOpen = value;
							await this.plugin.saveSettings();
						})
				)
				.addTextArea((textbox) =>
					textbox
						.setValue(this.plugin.settings.braceMarkdownSetClose)
						.setPlaceholder("json array of regexes")
						.onChange(async (value) => {
							this.plugin.settings.braceMarkdownSetClose = value;
							await this.plugin.saveSettings();
						})
				)
				.addExtraButton((button) =>
					button
						.setIcon("rotate-ccw")
						.setTooltip(localization["extraButtonRestore"][lang])
						.onClick(async () => {
							this.plugin.settings.braceMarkdownSetOpen = DEFAULT_SETTINGS.braceMarkdownSetOpen;
							this.plugin.settings.braceMarkdownSetClose = DEFAULT_SETTINGS.braceMarkdownSetClose;
							this.display();
							await this.plugin.saveSettings();
						})
				)
				.addExtraButton((button) =>
					button
						.setIcon("ban")
						.setTooltip(localization["extraButtonDisable"][lang])
						.onClick(async () => {
							this.plugin.settings.braceMarkdownSetOpen = "[]";
							this.plugin.settings.braceMarkdownSetClose = "[]";
							this.display();
							await this.plugin.saveSettings();
						})
				);
		}

		if (this.plugin.settings.developerMode) {
			containerEl.createEl("h5", {
				text: localization["pluginCompatibility"][lang],
			});

			new Setting(containerEl)
				.setName(localization["obsidianTableEditor"][lang])
				.setDesc(localization["obsidianTableEditorDesc"][lang])
				.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.obsidianTableEditor).onChange(async (value) => {
						this.plugin.settings.obsidianTableEditor = value;
						await this.plugin.saveSettings();
					})
				);

			if (this.plugin.settings.developerMode) {
				new Setting(containerEl)
					.setName(localization["advancedTables"][lang])
					.setDesc(localization["advancedTablesDesc"][lang])
					.addToggle((toggle) =>
						toggle.setValue(this.plugin.settings.useAdvancedTables).onChange(async (value) => {
							this.plugin.settings.useAdvancedTables = value;
							await this.plugin.saveSettings();
						})
					);
			}

			new Setting(containerEl)
				.setName(localization["outliner"][lang])
				.setDesc(localization["outlinerDesc"][lang])
				.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.useOutlinerBetterTab).onChange(async (value) => {
						this.plugin.settings.useOutlinerBetterTab = value;
						await this.plugin.saveSettings();
					})
				);
		}

		containerEl.createEl("h5", {
			text: localization["additional"][lang],
		});

		new Setting(containerEl)
			.setName(localization["customHotkey"][lang])
			.setDesc(localization["customHotkeyDesc"][lang])
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
				button
					.setIcon("rotate-ccw")
					.setTooltip(localization["extraButtonRestore"][lang])
					.onClick(async () => {
						this.plugin.settings.hotkey = DEFAULT_SETTINGS.hotkey;
						this.display(); // refresh display
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(localization["developerMode"][lang])
			.setDesc(localization["developerModeDesc"][lang])
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.developerMode).onChange(async (value) => {
					this.plugin.settings.developerMode = value;
					this.display(); // refresh display
					await this.plugin.saveSettings();
				})
			);
	}
}
