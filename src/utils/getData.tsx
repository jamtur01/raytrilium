import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Attribute, Note, NoteWithBranch } from "../types";

function setupTriliumApi() {
  const preferences = getPreferenceValues<Preferences>();
  const { triliumServerUrl, triliumApiKey } = preferences;

  if (!triliumServerUrl || !triliumApiKey) {
    throw new Error("Trilium server URL or API key is missing in preferences.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `${triliumApiKey}`,
  };

  return { baseUrl: triliumServerUrl, headers };
}

export async function getNoteById(noteId: string): Promise<Note> {
  const { baseUrl, headers } = setupTriliumApi();
  const url = `${baseUrl}/notes/${noteId}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return (await response.json()) as Note;
}

export async function findToDoNoteId(): Promise<string | null> {
  const rootNote = await getNoteById("root");
  if (!rootNote.childNoteIds) {
    return null;
  }

  for (const mainNoteId of rootNote.childNoteIds) {
    const mainNote = await getNoteById(mainNoteId);
    if (mainNote.childNoteIds) {
      for (const childNoteId of mainNote.childNoteIds) {
        const childNote = await getNoteById(childNoteId);
        if (childNote.title === "Task manager" && childNote.childNoteIds) {
          for (const taskNoteId of childNote.childNoteIds) {
            const taskNote = await getNoteById(taskNoteId);
            if (taskNote.title === "TODO") {
              return taskNote.noteId;
            }
          }
        }
      }
    }
  }

  return null;
}

export async function createNote(noteData: Omit<Note, "noteId" | "childNoteIds">) {
  const { baseUrl, headers } = setupTriliumApi();
  const url = `${baseUrl}/create-note`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(noteData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const {
      note: { noteId },
    } = (await response.json()) as NoteWithBranch;
    return noteId;
  } catch (error) {
    console.error("Error creating note:", error);
  }
}

export async function createAttribute(attribute: Attribute): Promise<Attribute> {
  const { baseUrl, headers } = setupTriliumApi();
  const url = `${baseUrl}/attributes`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(attribute),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as Attribute;
  } catch (error) {
    console.error("Error creating attribute:", error);
    throw error;
  }
}
