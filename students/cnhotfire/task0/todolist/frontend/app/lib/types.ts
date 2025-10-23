export type Todo = {
  id: number;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
};

export type TodoFormState = {
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
};
