import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface TabKeyPluginSettings {
	indentsIfSelection: boolean,
	useHardSpace: boolean
}

const DEFAULT_SETTINGS: TabKeyPluginSettings = {
	indentsIfSelection: true,
	useHardSpace: false // U+00A0 is technically not a space, let's not use it by default
}

let useTab: boolean = true; // default Obsidian settings
let tabSize: number = 4;

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
			editorCallback: (editor) => {
				let cursorFrom = editor.getCursor("from");
				let cursorTo = editor.getCursor("to");
				let cursorHead = editor.getCursor("head");
				let cursorAnchor = editor.getCursor("anchor");
				let somethingSelected = (cursorFrom.line != cursorTo.line || cursorFrom.ch != cursorTo.ch);
				let tabStr = (useTab ? '\t' : (this.settings.useHardSpace ? ' ' : ' ').repeat(tabSize));

				if (somethingSelected && this.settings.indentsIfSelection) {
					// indent lines
					for (let line = cursorFrom.line; line <= cursorTo.line; line++)
						editor.setLine(line, tabStr + editor.getLine(line));
					editor.setSelection({ line: cursorAnchor.line, ch: cursorAnchor.ch + tabStr.length }, { line: cursorHead.line, ch: cursorHead.ch + tabStr.length });
				}
				else {
					// insert tab
					editor.replaceSelection(tabStr);
					editor.setCursor({ line: cursorFrom.line, ch: cursorFrom.ch + tabStr.length });
				}
			}
		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		let path = app.vault.configDir + '/app.json';
		console.log('obsidian-tab-key: Loading Obsidian app settings for tab behaviour configuration');

		if (!(await app.vault.adapter.exists(path))) {
			console.error('obsidian-tab-key: Unable to locate app settings, will use tab as tab');
			return;
		}

		const data = await app.vault.adapter.read(path);
		let appSettings = JSON.parse(data);
		console.log(appSettings);

		if (appSettings.useTab != undefined)
			useTab = appSettings.useTab;
		if (appSettings.tabSize != undefined)
			tabSize = appSettings.tabSize;

		console.log('obsidian-tab-key: Obsidian settings: useTab = ' + useTab);
		console.log('                                     tabSize = ' + tabSize);
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
			.setName('Indents when selection is not empty')
			.setDesc('true(default): Select some text and press tab key will indent the selected lines. Same behaviour as most IDEs. \nfalse: Selection will be replaced with one tab')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.indentsIfSelection)
				.onChange(async (value) => {
					this.plugin.settings.indentsIfSelection = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Use hard spaces')
			.setDesc('If Obsidian app option "Editor > Behaviour > Indent using tabs" is false, space will be used to indent. If "Use hard spaces" is off, a normal space character will be used. Notice that with Markdown, repeated spaces will be rendered as one. Turn this option on to use hard spaces (U+00A0), which will not be truncated after Markdown render. Either way, indentation (leading spaces) will not show up in Reading View though')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useHardSpace)
				.onChange(async (value) => {
					this.plugin.settings.useHardSpace = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Reload Obsidian app options')
			.setDesc('You can decide whether to use tab or spaces for indentation. This setting is located at Options > Editor(the top-most one!) > Behaviour > Indent using tabs/Tab indent size. If it is incorrect, try updating the setting by changing the value and back.')
			.addButton(button => button
				.setIcon('refresh-cw')
				.onClick(async () => {
					await this.plugin.loadSettings();
					new Notice('Indent using tabs: ' + useTab + '\nTab indent size: ' + tabSize);
				}));

	}

}
