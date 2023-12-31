# Restore Tab Key Plugin for Obsidian
Restore tab key behaviour: tab key inserts a tab, the way it should be.

To summarize, **this plugin can make code blocks, or anywhere, behave like any IDE as you would expect, everything regarding tabs and indentation**, which Obsidian does terribly.

By default, there is no way to insert a tab character in Obsidian without cutting and pasting, can you believe that?

Sure, tabs are pretty useless in Markdown, however, that can't be said in Markdown code blocks, the tab key behavior is just absolutely unreasonable, and this plugin should solve that.

Check out the forum thread that inspired this plugin: [Feature Request: Option to disable tab to indent | Obsidian Forum](https://forum.obsidian.md/t/option-to-disable-tab-to-indent/40868)

## Restore Tab Key
### Before
![before](https://github.com/jrymk/restore-tab-key/assets/39593345/1c862e1d-b958-4a4e-a316-ce106676b2e8)

### After
![after](https://github.com/jrymk/restore-tab-key/assets/39593345/96c4dc5f-8396-46e3-af56-5b58f308a386)

---

## Braces Auto Indent
### Before
![before_braces](https://github.com/jrymk/restore-tab-key/assets/39593345/82bd4625-0220-43c0-b96b-44f0716b1ab4)

### After
![after_braces](https://github.com/jrymk/restore-tab-key/assets/39593345/6fe4ecb1-bdc7-46af-b677-95cf65cba878)


---

## Settings

### Quick configuration for just code
- Turn on `Only activate in code blocks`
- Decide to use space or tabs by setting `Use spaces instead of tab`

---

ALL the settings
![image](https://github.com/jrymk/restore-tab-key/assets/39593345/9cc236f5-9a8f-4077-9102-3efd2ebe61f8)
![image](https://github.com/jrymk/restore-tab-key/assets/39593345/d64b20ff-bc4e-414b-84ca-401c2439f5f2)

---

### Indent using tabs
Select some text and press tab to indent, like just about any IDE.\
The indent action is completely unaltered (native `indentMore` command), you can change "Indent using tabs" and "Tab indent size" in Editor settings to change that behavior.

---

### Hard space
Hard spaces (U+00A0) as tab allows you to insert wide blanks inside text. Without using hard spaces, repeated spaces (and tabs) will be rendered as one single space. You can toggle whether to use hard space instead of regular spaces.\
You can insert hard spaces in the beginning of a line to act like indentation. You will have to move the cursor to the beginning and press tab to insert them though. **Indenting (select text and press tab) will not insert hard spaces.**

live preview/source view: (Yes, with hard spaces as indentation it still turns into a code block. Aaargh!)\
![](img_hard-spaces.png)\
after render (reading view):\
![](img_hard-spaces-rendered.png)

---

### Also comes in Chinese
![image](https://github.com/jrymk/restore-tab-key/assets/39593345/40be7ed3-cc75-46bc-a6b5-afb5aaef609a)

设定页可选择显示语言，部分翻译内容和中国大陆在地化参考了 ACodeHX 的 fork。
