export type Values = {
  type: string;
  title: string;
  content: string;
  parentNoteId: string;
  todoDate?: Date;
};

export interface ParentNotesResponse {
  mainNotesFolderId: string;
  childNotes: Note[];
}

export interface Note {
  noteId: string;
  title: string;
  content?: string;
  type?: string;
  parentNoteId?: string;
  childNoteIds?: string[];
}

export interface Attribute {
  noteId: string;
  type: string; // 'label' or 'relation'
  name: string;
  value: string;
  position?: number;
  isInheritable?: boolean;
}

export interface NoteWithBranch {
  note: Note;
}
