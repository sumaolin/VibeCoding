'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TodoTable } from './components/TodoTable';
import { TodoModal } from './components/TodoModal';
import type { Todo, TodoFormState } from './lib/types';
import {
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
  type TodoCreatePayload,
} from './lib/api';
import { getErrorMessage } from './lib/errors';
import { datetimeLocalToIso, isoToDatetimeLocal } from './lib/datetime';

type SortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';
type SortOrder = 'asc' | 'desc';

const EMPTY_FILTERS = { status: '', priority: '', q: '' };
const EMPTY_FORM: TodoFormState = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
};

export default function HomePage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState<TodoFormState>({ ...EMPTY_FORM });
  const [modalError, setModalError] = useState('');
  const [bannerError, setBannerError] = useState('');

  const queryKey = useMemo(
    () => [
      'todos',
      { page, pageSize, sortBy, sortOrder, filters: appliedFilters },
    ] as const,
    [appliedFilters, page, pageSize, sortBy, sortOrder],
  );

  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
  } = useQuery({
    queryKey,
    keepPreviousData: true,
    queryFn: () =>
      listTodos({
        page,
        pageSize,
        sortBy,
        sortOrder,
        status: appliedFilters.status || undefined,
        priority: appliedFilters.priority || undefined,
        q: appliedFilters.q.trim() || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < maxPage;
  const isInitialLoading = isLoading && !data;
  const isRefreshing = isFetching && !!data;
  const listError = isError ? getErrorMessage(error) : '';

  useEffect(() => {
    if (!data) {
      return;
    }
    const nextMax = Math.max(1, Math.ceil(data.total / pageSize));
    if (page > nextMax) {
      setPage(nextMax);
    }
  }, [data, page, pageSize]);

  const invalidateTodos = () =>
    queryClient.invalidateQueries({ queryKey: ['todos'] });

  const createMutation = useMutation({
    mutationFn: (payload: TodoCreatePayload) => createTodo(payload),
    onSuccess: () => {
      setBannerError('');
      invalidateTodos();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TodoCreatePayload> }) =>
      updateTodo(id, payload),
    onSuccess: () => {
      setBannerError('');
      invalidateTodos();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTodo(id),
    onSuccess: () => {
      setBannerError('');
      invalidateTodos();
    },
  });

  function openCreate() {
    setIsEdit(false);
    setCurrentTodo(null);
    setForm({ ...EMPTY_FORM });
    setModalError('');
    setShowModal(true);
  }

  function openEdit(todo: Todo) {
    setIsEdit(true);
    setCurrentTodo(todo);
    setForm({
      title: todo.title,
      description: todo.description ?? '',
      status: todo.status,
      priority: todo.priority,
      dueDate: isoToDatetimeLocal(todo.dueDate),
    });
    setModalError('');
    setShowModal(true);
  }

  const handleFormChange = (patch: Partial<TodoFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const validateForm = () => {
    if (!form.title.trim() || form.title.trim().length > 100) {
      setModalError('标题必填且不超过100字符');
      return false;
    }
    if (form.description && form.description.length > 1000) {
      setModalError('描述不超过1000字符');
      return false;
    }
    if (!['todo', 'in_progress', 'done'].includes(form.status)) {
      setModalError('状态不合法');
      return false;
    }
    if (!['low', 'medium', 'high'].includes(form.priority)) {
      setModalError('优先级不合法');
      return false;
    }
    if (form.dueDate && !datetimeLocalToIso(form.dueDate)) {
      setModalError('截止日期需为有效的日期时间');
      return false;
    }
    setModalError('');
    return true;
  };

  async function submitForm() {
    if (!validateForm()) {
      return;
    }
    const dueDateIso = datetimeLocalToIso(form.dueDate);
    const payload: TodoCreatePayload = {
      title: form.title.trim(),
      description: form.description ? form.description : null,
      status: form.status,
      priority: form.priority,
      dueDate: dueDateIso,
    };
    try {
      if (isEdit && currentTodo) {
        await updateMutation.mutateAsync({ id: currentTodo.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
        setPage(1);
      }
      setShowModal(false);
      setModalError('');
    } catch (err) {
      setModalError(getErrorMessage(err, '保存失败'));
    }
  }

  async function toggleStatus(todo: Todo) {
    const nextStatus = todo.status === 'done' ? 'todo' : 'done';
    try {
      await updateMutation.mutateAsync({
        id: todo.id,
        payload: { status: nextStatus },
      });
    } catch (err) {
      setBannerError(getErrorMessage(err, '状态更新失败'));
    }
  }

  async function confirmDelete(todo: Todo) {
    if (!confirm(`确认删除任务: ${todo.title}?`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(todo.id);
      if (page > 1 && items.length <= 1) {
        setPage((prev) => Math.max(1, prev - 1));
      }
    } catch (err) {
      setBannerError(getErrorMessage(err, '删除失败'));
    }
  }

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setBannerError('');
  };

  const resetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
    setPage(1);
    setBannerError('');
  };

  return (
    <div className="container">
      <h1>待办事项</h1>
      <div className="toolbar">
        <input
          value={filters.q}
          onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          placeholder="搜索标题或描述"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              applyFilters();
            }
          }}
        />
        <select
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        >
          <option value="">全部状态</option>
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
        </select>
        <select
          value={filters.priority || ''}
          onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
        >
          <option value="">全部优先级</option>
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as SortField);
            setPage(1);
          }}
        >
          <option value="createdAt">创建时间</option>
          <option value="updatedAt">更新时间</option>
          <option value="dueDate">截止日期</option>
          <option value="priority">优先级</option>
        </select>
        <select
          value={sortOrder}
          onChange={(event) => {
            setSortOrder(event.target.value as SortOrder);
            setPage(1);
          }}
        >
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
        <button onClick={applyFilters}>查询</button>
        <button onClick={resetFilters}>重置筛选</button>
        <button onClick={openCreate}>新建任务</button>
      </div>
      {listError && <div className="error">{listError}</div>}
      {!listError && bannerError && <div className="error">{bannerError}</div>}
      {isRefreshing && <div style={{ color: '#666', marginBottom: 12 }}>数据刷新中...</div>}
      <TodoTable
        items={items}
        loading={isInitialLoading}
        onEdit={openEdit}
        onToggle={toggleStatus}
        onDelete={confirmDelete}
      />
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
        <button disabled={!hasPrev} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
          上一页
        </button>
        <span style={{ padding: 8 }}>
          第 {page} / {maxPage} 页
        </span>
        <button disabled={!hasNext} onClick={() => setPage((prev) => prev + 1)}>
          下一页
        </button>
        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span style={{ padding: 8 }}>共 {total} 条</span>
      </div>

      <TodoModal
        show={showModal}
        isEdit={isEdit}
        form={form}
        error={modalError}
        submitting={createMutation.isPending || updateMutation.isPending}
        onChange={handleFormChange}
        onSubmit={submitForm}
        onClose={() => {
          if (createMutation.isPending || updateMutation.isPending) {
            return;
          }
          setShowModal(false);
        }}
      />
    </div>
  );
}
