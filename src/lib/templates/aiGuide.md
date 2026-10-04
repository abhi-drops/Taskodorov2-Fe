# Taskodoro template guide for AI assistants

This guide explains the Taskodoro workspace template file, so that an AI assistant
(ChatGPT, Claude, Gemini or any other) can write a new template or edit an existing one.

**If you are a person:** paste this whole guide into your AI assistant, then say what you
want, for example "Make me a template for planning a wedding". To change a template you
already have, export it from the Templates app and paste the file's contents after the
guide, with what you want changed. Save the assistant's answer as a file ending in
`.json` and bring it into Taskodoro (see "Using the file" at the end).

**If you are an AI assistant:** follow the rules below exactly. Reply with one JSON
document in a single code block and nothing that the user could mistake for part of the
file. If the request is unclear, ask before writing.

## What a template is

Taskodoro is a board app. A **workspace** holds **groups** (the board's columns), and a
group holds **notes** (sticky-note cards). A **template** is the starting shape of a
workspace: its groups, each group's settings, and a few sample notes. It holds structure
only. It never holds progress: no checked notes, no counter values, no history.

## The file

One JSON document, saved with a name ending in `.json` (Taskodoro's own exports end in
`.taskodoro.json`).

```json
{
  "app": "taskodoro",
  "kind": "workspace-template",
  "version": 1,
  "name": "Template name",
  "content": {
    "groups": [],
    "completedGroupKey": null
  }
}
```

| Field | Rule |
|---|---|
| `app` | Must be exactly `"taskodoro"`. |
| `kind` | Must be exactly `"workspace-template"`. |
| `version` | `1`. |
| `name` | The template's name, shown in the app. Short, sentence case. |
| `content.groups` | The groups, in board order (left to right). Required, may be empty. |
| `content.completedGroupKey` | The `key` of the group that means "done", or `null`. |

A file whose `app` or `kind` is wrong, or that has no `content.groups` list, is rejected.

## A group

```json
{
  "key": "todo",
  "name": "To do",
  "sortedBy": "manual",
  "noteColorMode": "manual",
  "onCheckMoveToKey": "doing",
  "resetOnMove": true,
  "notes": []
}
```

| Field | Rule |
|---|---|
| `key` | Any short text, unique among the groups in this file. Only used to link groups to each other inside the file; the user never sees it. |
| `name` | The column's name. Keep it short: one to three words. |
| `sortedBy` | How notes in the group are ordered: `"manual"` (drag order), `"alphabetical"`, `"date"` (newest first) or `"priority"`. |
| `noteColorMode` | `"manual"`: each note keeps its own `color`. `"priority"`: colour comes from the note's `priority` and its `color` is ignored. |
| `onCheckMoveToKey` | The `key` of the group a note moves to when the user checks it, or `null` to stay put. Must not be the group's own key. |
| `resetOnMove` | Only matters when `onCheckMoveToKey` is set. `true`: the note arrives unchecked (it was just "moved along"). `false`: it arrives still checked (it is really finished). |
| `notes` | The group's sample notes, top to bottom. May be empty. |

## A note

```json
{
  "key": "n1",
  "type": "basic",
  "title": "Buy tickets",
  "description": null,
  "color": "yellow",
  "priority": "normal",
  "counterStep": 1,
  "counterTarget": null,
  "listItems": []
}
```

| Field | Rule |
|---|---|
| `key` | Any short text, unique in the file. |
| `type` | `"basic"` (a task with a checkbox), `"counter"` (a number with + and − buttons) or `"list"` (a checklist). |
| `title` | Required. A note with no title is dropped on import. |
| `description` | Longer text, or `null`. |
| `color` | `"yellow"`, `"coral"`, `"blue"`, `"green"`, or `null` (shown as yellow). |
| `priority` | `"low"`, `"normal"`, `"medium"` or `"high"`. |
| `counterStep` | Counter notes: how much each press adds. A number above 0, usually `1`. |
| `counterTarget` | Counter notes: the goal, or `null` for none. |
| `listItems` | List notes: the checklist items as plain text, in order. |

Write all nine fields on every note. For fields that don't apply to the note's type, use
the defaults: `"counterStep": 1`, `"counterTarget": null`, `"listItems": []`.

In a group with `"noteColorMode": "priority"`, colours are: high = coral, medium =
yellow, normal = blue, low = green.

## What Taskodoro does with mistakes

- An unknown value for `sortedBy`, `noteColorMode`, `type` or `priority` falls back to
  `"manual"`, `"manual"`, `"basic"` and `"normal"`.
- An unknown `color` becomes `null`.
- `onCheckMoveToKey` or `completedGroupKey` pointing at a key that isn't in the file is
  cleared.
- A group with no name is called "Group 1", "Group 2" and so on.
- Limits: 50 groups, 200 notes per group, 200 items per list, 2000 characters per text.
  Anything past a limit is cut off.

Do not rely on these. Write valid values.

## Do not add

- Checked or completed flags, counter values, statuses, dates or ids. A template has no
  state; any such field is ignored.
- Comments, trailing commas or anything else that isn't strict JSON.

## Making a good template

- **Three to six groups** suit most boards. More than eight is hard to read on a phone,
  where one group shows at a time.
- **Model a flow where there is one.** If notes move through stages, chain the groups
  with `onCheckMoveToKey` and set `completedGroupKey` to the last one. Use
  `"resetOnMove": true` for the in-between steps and `false` on the step that leads into
  the final group, so a finished note stays checked.
- **No flow, no chain.** For boards that only sort things (ideas, categories), leave
  `onCheckMoveToKey` and `completedGroupKey` as `null`.
- **A few sample notes, not a full plan.** Two to five notes in total is enough to show
  how the board works. Leave most groups empty, especially the last ones.
- **Use sample-note titles to tell the user what to do next.** See the next section.
- **Pick the right note type.** Use `list` for a set of steps, `counter` for something
  counted towards a goal (glasses of water, pages read), `basic` for everything else.
- **Vary the colours** in manual-colour groups so the board is easy to scan.
- Write titles the way a person would write on a sticky note: short and concrete.

## Sample notes that teach the board

A person opening a new workspace cannot see its settings: nothing on the board says that
checking a note in "On hold" sends it to "In progress". The sample notes are the only
place to tell them. So write at least some sample-note **titles as short instructions for
the next action**, matched to the settings of the group the note sits in.

- **In a group with `onCheckMoveToKey`:** say what checking does and where the note goes.
  - "Click the checkbox when a task is off hold" (in an "On hold" group that moves to
    "In progress")
  - "Check me to send me to In progress"
  - "Check a topic again to mark it mastered"
- **In the first group:** one note that says how to start, such as "Click a note to edit
  its title, type and colour".
- **For a `list` note:** a title that says what the checklist is for; if the group moves
  notes on check, mention that the note moves once every item is ticked.
- **For a `counter` note:** say what to count, such as "Press + for every glass of water".
- **In a group sorted by priority or coloured by priority:** one note that says so, such
  as "High priority notes turn coral and rise to the top".
- **In a group with no settings** (plain storage): an ordinary example note is fine.

Rules for these instruction titles:

- The instruction must be **true for the settings you wrote**. Do not say "check me to
  move on" in a group whose `onCheckMoveToKey` is `null`, and name the real target group.
- Put the instruction in `title`, where it is always visible on the card. Use
  `description` only for extra detail.
- One instruction per note, in plain words, short enough to read on a small card (aim
  for under 80 characters).
- Do not turn every note into an instruction. Mix them with one or two realistic example
  notes, so the board also shows what real content looks like.
- When editing an existing template, if you change a group's settings, also fix any
  sample-note title that described the old behaviour.

## Editing an existing template

When the user pastes an exported template:

- Change only what they asked for. Keep every other group, setting and note as it is.
- Keep existing `key`s where you can, and make sure every `onCheckMoveToKey` and
  `completedGroupKey` still points at a group that exists.
- When you delete a group, also clear or re-point anything that linked to it.
- Give new groups and notes new keys that nothing else in the file uses.
- Return the whole file, not just the changed part.

## A complete example

```json
{
  "app": "taskodoro",
  "kind": "workspace-template",
  "version": 1,
  "name": "Trip planning",
  "content": {
    "groups": [
      {
        "key": "to-book",
        "name": "To book",
        "sortedBy": "priority",
        "noteColorMode": "priority",
        "onCheckMoveToKey": "booked",
        "resetOnMove": false,
        "notes": [
          {
            "key": "n1",
            "type": "basic",
            "title": "Check the box once a booking is confirmed to move it to Booked",
            "description": "High priority notes turn coral and sort to the top of this group",
            "color": null,
            "priority": "high",
            "counterStep": 1,
            "counterTarget": null,
            "listItems": []
          },
          {
            "key": "n2",
            "type": "basic",
            "title": "Flights",
            "description": null,
            "color": null,
            "priority": "medium",
            "counterStep": 1,
            "counterTarget": null,
            "listItems": []
          }
        ]
      },
      {
        "key": "to-pack",
        "name": "To pack",
        "sortedBy": "manual",
        "noteColorMode": "manual",
        "onCheckMoveToKey": null,
        "resetOnMove": true,
        "notes": [
          {
            "key": "n3",
            "type": "list",
            "title": "Documents",
            "description": null,
            "color": "blue",
            "priority": "normal",
            "counterStep": 1,
            "counterTarget": null,
            "listItems": ["Passport", "Tickets", "Travel insurance"]
          },
          {
            "key": "n4",
            "type": "counter",
            "title": "Outfits",
            "description": null,
            "color": "green",
            "priority": "normal",
            "counterStep": 1,
            "counterTarget": 5,
            "listItems": []
          }
        ]
      },
      {
        "key": "booked",
        "name": "Booked",
        "sortedBy": "manual",
        "noteColorMode": "priority",
        "onCheckMoveToKey": null,
        "resetOnMove": true,
        "notes": []
      }
    ],
    "completedGroupKey": "booked"
  }
}
```

## Using the file

1. Save the assistant's JSON as a file ending in `.json`, for example
   `trip-planning.taskodoro.json`.
2. In Taskodoro, open **Apps**, then **Templates**.
3. **A new template:** press **Import** and choose the file. It appears under "Yours". If
   a template with that name already exists, the new one is named "Name (2)".
4. **An updated version of a template you already have:** open that template and press
   **Replace from file**. Its groups and sample notes are replaced by the file's; its
   name stays the same.
5. You can also press **Import template** in the "New workspace" dialog to import a file
   and start a workspace from it in one go.
