export interface Comentario {
  id: string;
  mediaItemId: string;
  userId: string;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DenunciaComentario {
  id: string;
  commentId: string;
  reporterUserId: string;
  reason: string;
  details?: string;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}
