import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getNoteById, createNote, createAttribute, findToDoNoteId } from "./utils/getData";
import { Attribute, Note, ParentNotesResponse, Values } from "./types";

async function fetchParentNotes(): Promise<ParentNotesResponse> {
  try {
    const rootNote = await getNoteById("root");
    if (!rootNote.childNoteIds) {
      throw new Error("No child notes found for root");
    }

    const mainNotesFolderId = rootNote.childNoteIds[0];
    const mainNotesFolder = await getNoteById(mainNotesFolderId);

    if (!mainNotesFolder.childNoteIds) {
      throw new Error("No child notes found for the main notes folder");
    }

    const childNotes: Note[] = await Promise.all(
      mainNotesFolder.childNoteIds.map(async (id) => {
        const note = await getNoteById(id);
        return { noteId: note.noteId, title: note.title };
      }),
    );

    const parentNotes = {
      mainNotesFolderId: mainNotesFolderId,
      childNotes: [
        { noteId: mainNotesFolderId, title: mainNotesFolder.title },
        ...childNotes.map((note) => ({ noteId: note.noteId, title: note.title })),
      ],
    };

    return parentNotes;
  } catch (error) {
    console.error("Error fetching parent notes:", error);
    return { mainNotesFolderId: "", childNotes: [] };
  }
}

async function addNote(attrs: Values) {
  let parentNoteId = attrs.parentNoteId;

  if (attrs.type === "todo" && !parentNoteId) {
    parentNoteId = (await findToDoNoteId()) as string;

    if (!parentNoteId) {
      throw new Error("TODO note not found under Task Manager");
    }
  }

  const noteAttributes = {
    parentNoteId,
    type: "text",
    title: attrs.title,
    content: attrs.content,
  };

  try {
    const newNoteId = (await createNote(noteAttributes)) as string;

    if (attrs.type === "todo" && attrs.todoDate) {
      const todoAttribute: Attribute = {
        noteId: newNoteId,
        type: "label",
        name: "todoDate",
        value: attrs.todoDate.toISOString().split("T")[0],
      };

      await createAttribute(todoAttribute);
    }
  } catch (error) {
    console.error("Error adding note:", error);
    throw error;
  }
}

export default function Command() {
  const [parentNotes, setParentNotes] = useState<Note[]>([]);
  const [defaultParentNoteId, setDefaultParentNoteId] = useState<string>("");
  const [noteType, setNoteType] = useState<string>("todo");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    async function loadParentNotes() {
      const data = await fetchParentNotes();
      if (data) {
        setParentNotes(data.childNotes);
        setDefaultParentNoteId(data.mainNotesFolderId);
      }
    }

    loadParentNotes();
  }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
  };

  function handleNoteTypeChange(newType: string) {
    setNoteType(newType);
  }

  function handleSubmit(values: Values) {
    const { title, content, parentNoteId } = values;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      const errorMessage = !trimmedTitle ? "Note title is required." : "Note content is required.";
      showToast({ style: Toast.Style.Failure, title: "Validation Error", message: errorMessage });
      return;
    }

    try {
      addNote({
        type: noteType,
        title,
        content,
        parentNoteId,
        todoDate: values.todoDate,
      });
      showToast({ title: "Created note", message: title });
      resetForm();
    } catch (error) {
      console.error("Error creating note:", error);
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to create note." });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new note in Trilium." />
      <Form.Dropdown id="type" title="Note type" value={noteType} onChange={handleNoteTypeChange}>
        <Form.Dropdown.Item value="todo" title="TODO" />
        <Form.Dropdown.Item value="text" title="Text" />
      </Form.Dropdown>
      <Form.TextField
        id="title"
        title="Note title"
        value={title}
        onChange={setTitle}
        placeholder="Enter the note's title"
      />
      <Form.TextArea
        id="content"
        title="Note"
        value={content}
        onChange={setContent}
        placeholder="Enter the note's content"
      />
      <Form.Separator />

      {noteType === "todo" && (
        <Form.DatePicker id="todoDate" title="TODO due date" defaultValue={new Date(Date.now())} />
      )}

      {noteType === "text" && (
        <Form.Dropdown id="parentNoteId" title="Parent Note" defaultValue={defaultParentNoteId}>
          {parentNotes.map((note) => (
            <Form.Dropdown.Item key={note.noteId} value={note.noteId} title={note.title} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
