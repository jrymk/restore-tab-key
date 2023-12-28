# Restore Tab Key Plugin for Obsidian
Restore tab key behaviour: tab key inserts a tab, the way it should be.

#### Before
![before](https://github.com/jrymk/restore-tab-key/assets/39593345/1c862e1d-b958-4a4e-a316-ce106676b2e8)
#### After
![after](https://github.com/jrymk/restore-tab-key/assets/39593345/96c4dc5f-8396-46e3-af56-5b58f308a386)

---

To summarize, **this plugin make the tab key insert tabs**, **without affecting the ability to quickly indenting lines**, just like most IDEs. In addition, it allows you to insert hard spaces quickly if you want a wide blank inside text.

![restoreTabKeyDemo](https://user-images.githubusercontent.com/39593345/220376206-de457056-2a52-48f9-ad57-e69fa42b909a.gif)

it solves the problem mentioned in this forum thread: https://forum.obsidian.md/t/option-to-disable-tab-to-indent/40868

---

## Default behavior of the plugin

When the Tab key is pressed...
- Indent the lines that are selected, if there is any. If nothing is selected,
- Indent the current line, if the current line is an empty list (0 or more tabs, followed by `- ` or `no. `), or
- Insert a tab, otherwise

Shift + Tab reduces indentation on the selected lines.

## Only in code blocks

If you just want IDE-like tabbing experience in code blocks, now you can do that!

---

## Settings

![image](https://github.com/jrymk/restore-tab-key/assets/39593345/020faaf1-1bce-4f34-8155-184774dd2a46)
![image](https://github.com/jrymk/restore-tab-key/assets/39593345/621b3a20-f26d-4c0d-a20b-e2eb58e76b77)


The tab key now works just like any other IDE. If you select some text and press tab, the selected lines will be indented. If nothing is selected, a tab will be inserted. There is also an option to insert tab regardless.

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
