import { App, Editor, MarkdownView, KeymapContext, Hotkey, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface TabKeyPluginSettings {
	indentsIfSelection: boolean,
	useSpaces: boolean,
	useHardSpace: boolean,
	spacesCount: number,
	allowException: boolean,
	exceptionRegex: string
}

const DEFAULT_SETTINGS: TabKeyPluginSettings = {
	indentsIfSelection: true,
	useSpaces: false,
	useHardSpace: true, // U+00A0 is technically not a space, let's not use it by default
	spacesCount: 4,
	allowException: true,
	exceptionRegex: "^((\t)*- )$|^((\t)*[0-9]+. )$"
}

export default class TabKeyPlugin extends Plugin {
	settings: TabKeyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingTab(this.app, this));

		this.addCommand({
			id: 'obs-tab-tab-key',
			name: '(internal) tab key trigger',
			hotkeys: [
				{
					key: "Tab",
					modifiers: []
				}
			],
			editorCallback: (editor: Editor) => {
				let cursorFrom = editor.getCursor("from");
				let cursorTo = editor.getCursor("to");
				let somethingSelected = (cursorFrom.line != cursorTo.line || cursorFrom.ch != cursorTo.ch);
				if (somethingSelected && this.settings.indentsIfSelection) {
					editor.exec('indentMore');
				} else {
					let cursorFrom = editor.getCursor("from");
					let tabStr = (this.settings.useSpaces ? (this.settings.useHardSpace ? ' ' : ' ').repeat(this.settings.spacesCount) : '\t');

					if (!somethingSelected && this.settings.allowException) {
						if (RegExp(this.settings.exceptionRegex).test(editor.getLine(cursorFrom.line))) {
							editor.exec('indentMore');
							return;
						}
					}

					// insert tab
					editor.replaceSelection(tabStr);
					editor.setCursor({ line: cursorFrom.line, ch: cursorFrom.ch + tabStr.length });
				}
			},
		});
	}

	onunload() {
	}

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
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Obsidian Tab Key Plugin' });
		containerEl.createEl('i', { text: 'Restore tab key behaviour: tab key inserts a tab, the way it should be.' });
		containerEl.createEl('br');

		new Setting(containerEl)
			.setName('Use spaces instead of tab')
			.setDesc('false(default): Insert tab (\\t) when tab key is pressed. true: Insert spaces (    ) when tab key is pressed.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useSpaces)
				.onChange(async (value) => {
					this.plugin.settings.useSpaces = value;
					this.display(); // refresh display
					await this.plugin.saveSettings();
				}));

		if (this.plugin.settings.useSpaces) {
			new Setting(containerEl)
				.setName('Use hard spaces')
				.setDesc('If "Indent using tabs" is false, space will be used to indent. If "Use hard spaces" is off, a normal space character will be used. Notice that with Markdown, repeated normal spaces will be rendered as one. Turn this option on to use hard spaces (U+00A0), which will not be truncated after Markdown render. To indent stuff in the processed Markdown output, move your cursor to the begin and press tab (indenting won\'t insert hard spaces)')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.useHardSpace)
					.onChange(async (value) => {
						this.plugin.settings.useHardSpace = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Space count')
				.setDesc('The number of spaces or hard spaces inserted when tab key is pressed. default: 4')
				.addSlider(slider => slider
					.setValue(this.plugin.settings.spacesCount)
					.setLimits(2, 8, 1)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.spacesCount = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName('Indents when selection is not empty')
			.setDesc('true(default): Select some text and press tab key will indent the selected lines. Same behaviour as most IDEs. \nfalse: Selection will be replaced with one tab')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.indentsIfSelection)
				.onChange(async (value) => {
					this.plugin.settings.indentsIfSelection = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Allow exceptions for indenting')
			.setDesc('Indent line even when the selection is empty when the line matches the regex')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.allowException)
				.onChange(async (value) => {
					this.plugin.settings.allowException = value;
					this.display(); // refresh display
					await this.plugin.saveSettings();
				}));
		if (this.plugin.settings.allowException) {
			new Setting(containerEl)
				.setName('Exception regex')
				.setDesc('Default: Indents regardless in lists (zero or more tabs, followed by - or number. and then a space)')
				.addText(textbox => textbox
					.setValue(this.plugin.settings.exceptionRegex)
					.setPlaceholder('Regex')
					.onChange(async (value) => {
						this.plugin.settings.exceptionRegex = value;
						await this.plugin.saveSettings();
					}))
				.addExtraButton(button => button
					.setIcon('rotate-ccw')
					.onClick(async () => {
						this.plugin.settings.exceptionRegex = '^((\t)*- )$|^((\t)*[0-9]+. )$'
						this.display();
						await this.plugin.saveSettings();
					}))
		}
	}

}
