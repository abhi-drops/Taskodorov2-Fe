# Feature: Templates

A **template** is a workspace's structure, not its data: its groups, each group's
settings, the workspace's Completed group, and a few sample notes. Templates are stored
on the device, can be edited, exported to a file and imported from one, and are what a
new workspace starts from. Added 2026-10-05.

Two connected parts:

1. **Templates app** (`/apps/templates`, `/apps/templates/:templateId`): list, create,
   edit, duplicate, delete, export and import templates.
2. **Template picker** in the "New workspace" dialog (`feat-workspaces.md`).

## Data model

`src/types/template.ts`.

- `Template`: `id`, `name`, `builtinId` (set only on the templates the app ships with),
  `position`, `content`.
- `TemplateContent`: `groups[]` and `completedGroupKey`.
- `TemplateGroup`: `key`, `name`, `sortedBy`, `noteColorMode`, `onCheckMoveToKey`,
  `resetOnMove`, `notes[]`.
- `TemplateNote`: `key`, `type`, `title`, `description`, `color`, `priority`,
  `counterStep`, `counterTarget`, `listItems` (texts only).

Two rules shape this:

- **Keys, not ids.** Groups and notes carry template-local `key`s. Links between groups
  (`onCheckMoveToKey`, `completedGroupKey`) point at keys. Real database ids are minted
  only when a workspace is made from the template.
- **Structure, not state.** A sample note has no checked flag, counter value or
  statuses. Counters start at 0 and checklist items unchecked.

Storage is the `templates` table (`feat-offline-data-layer.md`): one row per template,
with `content` as a JSON column, since a template is only ever read and written whole.

## Built-in templates

`src/lib/templates/builtins.ts` holds the factory versions as constants
(`BUILTIN_TEMPLATES`): Default, Shopping list, Brainstorm, Weekly planner (a group per
day plus Done), Project kanban, Study plan.

- `seedBuiltinTemplates` (`seedBuiltins.ts`) runs on every launch and inserts any
  built-in whose `builtin_id` is missing. A built-in added in a later release therefore
  reaches existing installs, and an edited one is never overwritten.
- Built-ins are **editable in place** and **cannot be deleted**. The editor's "Reset to
  Default" danger chip writes the constant back over the row (`resetBuiltinTemplate`).
- They hold negative `position`s so they always list before the user's own templates.
  Their order in the constant is their order in the app; the first three are the ones
  the "New workspace" dialog shows before "More templates".
- **Default is also the first-run board.** `seedIfEmpty` (and so Settings' global "Reset
  to Default") instantiates the `DEFAULT_TEMPLATE_CONTENT` constant directly, not the
  user's edited copy, so a factory reset really is factory. The `templates` table itself
  is left alone by that reset.

## Making a workspace from a template

`instantiateTemplate(db, content, workspaceName)` in `src/lib/templates/instantiate.ts`
is the one code path, used by the first-run seed and by
`createWorkspaceFromTemplate` (`lib/db/workspaces.ts`).

- It takes the **raw connection** and must run inside one `withDb` callback. It must not
  call `createGroup`/`createNote`: those queue behind the callback awaiting them and
  would deadlock.
- It generates all group ids first (a group may move notes to a later group), then
  inserts groups, sets `completed_group_id`, then inserts notes.
- It logs `logGroupCreated`/`logNoteCreated` for every row, so the Diary shows the sample
  notes as created on that day.
- Blank checklist items are skipped.

## Templates app

Hook + page split as usual: `common_logics/useTemplates.ts`, `useNewTemplate.ts`,
`useTemplateEditor.ts`; pages `TemplatesPage.tsx`, `TemplateEditorPage.tsx`; chrome in
`components/TemplatesShell.tsx` (the same shape as `DiaryShell`).

### List (`/apps/templates`)

Two sections, "Built-in" and "Yours". Each row is a `CHIP` linking to the editor, with a
`TemplateThumb`, the name, a "3 groups, 3 sample notes" line, and export / duplicate /
delete icons (no delete on built-ins). The toolbar has Import and New template.

**New template** (`NewTemplateDialog`): a name, and "Start from" either a blank template
or one of the user's workspaces. From a workspace, all groups and their settings are
copied; its notes are listed with checkboxes and **none is ticked to begin with**, so
personal notes never land in a template (or an exported file) by accident.
`workspaceToTemplateContent` (`fromWorkspace.ts`) does the capture and drops ids, checked
state, counter values and statuses.

### Editor (`/apps/templates/:templateId`)

A live preview of the board the template makes.

- **Desktop:** `TemplateBoard` draws every group as a column with the same chip +
  backdrop markup as `DiaryReplayBoard`. The chip opens the group's settings, the purple
  "+" adds a sample note, the last column is the "+ New group" chip.
- **Mobile:** `Tabs` for the groups, the active group's notes, then "Add sample note"
  and "<group> settings" chips and the "+ New group" chip.
- **The cards are the real note cards** (`BasicNoteCard`, `CounterNoteCard`,
  `ListNoteCard`) in their `readOnly` + `onSelect` mode, fed by `lib/templates/preview.ts`,
  which turns template groups and notes into `Group`/`Note` shapes with the keys as ids.
  Nothing in the preview can write to the database.
- **Group settings** (`TemplateGroupDialog`): name, Move left / Move right, the shared
  `GroupSettingsFields` dropdowns (also used by Settings' Group Settings page), delete.
  Deleting a group clears any "On Check Move To" or Completed Group that pointed at it.
- **Sample note** (`TemplateNoteDialog`): title, description, type, counter step and
  target or checklist items, colour, priority, delete. A new note that is closed without
  a title is discarded, like the real editor.
- **Completed Group** select and the danger chip (Reset to Default for a built-in,
  Delete This Template otherwise) sit under the board.
- **Saving:** every change goes through `edit()` with a pure function from
  `lib/templates/editContent.ts`, shows at once and is written after a 600 ms pause
  (flushed on leaving the page). No Save button.
- **Use template** opens the "New workspace" dialog with this template preselected, then
  goes to the board.

Not in this version: drag and drop inside the editor, and reordering templates (so the
three shown first in the picker are fixed).

## Export and import

- **File:** `<slug>.taskodoro.json`, containing
  `{ app: 'taskodoro', kind: 'workspace-template', version: 1, name, content }`
  (`lib/templates/templateFile.ts`).
- **Export** (`lib/platform/fileTransfer.ts`, `exportTextFile`): a browser download on
  web. On Android a WebView can't download a Blob, so the file is written to the app's
  cache directory (`@capacitor/filesystem`) and handed to the system share sheet
  (`@capacitor/share`). No storage permission is needed. Backing out of the share sheet
  is not treated as an error.
- **Import** (`pickTextFile`): a hidden `<input type="file">` on both platforms;
  Capacitor's Android WebView opens the system picker for it. No `accept` filter on
  Android, because its picker greys files out by MIME type and a `.json` received
  through a chat app often has a generic one.
- **`parseTemplateFile` treats the file as untrusted.** It returns `null` unless `app`
  and `kind` match (shown as "This file isn't a Taskodoro template..."). Otherwise it is
  tolerant: unknown enum values fall back to defaults, notes without a title are
  skipped, links to groups not in the file are dropped, sizes are capped, and every
  group and note is re-keyed.
- An imported template is always a user template. A name already in use becomes
  "Name (2)".

**Not verifiable in a browser:** the Android export and the Android file picker are
`isNative` paths. Check them on a device.

## `TemplateThumb`

`components/TemplateThumb.tsx`: a tiny picture of a template's board made from the
board's own shapes, one column per group (an ink bar for the chip) with a block per
sample note in its sticky colour (priority colours when the group uses them). Decorative
(`aria-hidden`); the name always sits beside it. Used in the list rows and the picker
tiles.
