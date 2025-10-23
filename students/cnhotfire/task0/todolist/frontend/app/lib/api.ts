import type { Todo } from './types';
import { extractErrorMessage } from './errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

export type TodoStatus = 'todo' | 'in_progress' | 'done';
export type TodoPriority = 'low' | 'medium' | 'high';

export type TodoListParams = {
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';
  sortOrder: 'asc' | 'desc';
  status?: TodoStatus;
  priority?: TodoPriority;
  q?: string;
};

export type TodoListResponse = {
  items: Todo[];
  page: number;
  pageSize: number;
  total: number;
};

export type TodoCreatePayload = {
  title: string;
  description?: string | null;
  status?: TodoStatus;
  dueDate?: string | null;
  priority?: TodoPriority;
};

export type TodoUpdatePayload = Partial<TodoCreatePayload>;

async function buildRequestError(response: Response): Promise<Error> {
  let message = `请求失败（${response.status}）`;
  try {
    const data = await response.json();
    message = extractErrorMessage(data) ?? message;
  } catch {
    // ignore JSON parse errors and keep default message
  }
  return new Error(message);
}

export async function listTodos(params: TodoListParams): Promise<TodoListResponse> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.status) search.set('status', params.status);
  if (params.priority) search.set('priority', params.priority);
  if (params.q) search.set('q', params.q);

  const response = await fetch(`${API_BASE_URL}/todos?${search.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  return (await response.json()) as TodoListResponse;
}

export async function createTodo(payload: TodoCreatePayload): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  return (await response.json()) as Todo;
}

export async function updateTodo(id: number, payload: TodoUpdatePayload): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  return (await response.json()) as Todo;
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 204) {
    throw await buildRequestError(response);
  }
}
