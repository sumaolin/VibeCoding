import React from 'react';

import type { TodoFormState } from '../lib/types';

type Props = {
  show: boolean;
  isEdit: boolean;
  form: TodoFormState;
  error: string;
  submitting?: boolean;
  onChange: (patch: Partial<TodoFormState>) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function TodoModal({
  show,
  isEdit,
  form,
  error,
  submitting = false,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  if (!show) {
    return null;
  }
  const submitLabel = submitting ? '处理中...' : isEdit ? '保存' : '创建';
  return (
    <div
      className="modal show"
      onClick={(event) => {
        if (event.currentTarget === event.target && !submitting) {
          onClose();
        }
      }}
    >
      <div className="card">
        <h3>{isEdit ? '编辑任务' : '新建任务'}</h3>
        {error && <div className="error">{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={form.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="标题（必填≤100）"
            disabled={submitting}
          />
          <textarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="描述（≤1000）"
            disabled={submitting}
          />
          <select
            value={form.status}
            onChange={(event) => onChange({ status: event.target.value as TodoFormState['status'] })}
            disabled={submitting}
          >
            <option value="todo">待办</option>
            <option value="in_progress">进行中</option>
            <option value="done">已完成</option>
          </select>
          <select
            value={form.priority}
            onChange={(event) =>
              onChange({ priority: event.target.value as TodoFormState['priority'] })
            }
            disabled={submitting}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>截止时间</span>
            <input
              type="datetime-local"
              value={form.dueDate}
              onChange={(event) => onChange({ dueDate: event.target.value })}
              disabled={submitting}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onSubmit} disabled={submitting}>
            {submitLabel}
          </button>
          <button onClick={onClose} disabled={submitting}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
