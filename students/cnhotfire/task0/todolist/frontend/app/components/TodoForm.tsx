import React from 'react';

import type { TodoFormState } from '../lib/types';

type Props = {
  form: TodoFormState;
  onChange: (patch: Partial<TodoFormState>) => void;
  onSubmit: () => void;
  submitText?: string;
  disabled?: boolean;
};

export function TodoForm({ form, onChange, onSubmit, submitText = '保存', disabled = false }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          value={form.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="标题（必填≤100）"
          disabled={disabled}
        />
        <textarea
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="描述（≤1000）"
          disabled={disabled}
        />
        <select
          value={form.status}
          onChange={(event) => onChange({ status: event.target.value as TodoFormState['status'] })}
          disabled={disabled}
        >
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
        </select>
        <select
          value={form.priority}
          onChange={(event) => onChange({ priority: event.target.value as TodoFormState['priority'] })}
          disabled={disabled}
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
            disabled={disabled}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onSubmit} disabled={disabled}>
          {submitText}
        </button>
      </div>
    </div>
  );
}
