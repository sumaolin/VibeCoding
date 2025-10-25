'use client';

import { useEffect, useState } from 'react';
import { TodoForm } from '../../components/TodoForm';

type Todo = {
  id: number;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
};

export default function EditTodoPage({ params }: { params: { id: string } }) {
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' });
  const baseURL = '/api';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${baseURL}/todos/${params.id}`);
        if (!res.ok) throw new Error('加载失败');
        const t: Todo = await res.json();
        setForm({ title: t.title, description: t.description || '', status: t.status, priority: t.priority, dueDate: t.dueDate || '' });
      } catch (e: any) {
        setError(e.message || '请求失败');
      }
    })();
  }, [params.id]);

  async function submit() {
    if (!form.title || form.title.length > 100) { setError('标题必填且不超过100字符'); return; }
    if (form.description && form.description.length > 1000) { setError('描述不超过1000字符'); return; }
    if (!['todo','in_progress','done'].includes(form.status)) { setError('状态不合法'); return; }
    if (!['low','medium','high'].includes(form.priority)) { setError('优先级不合法'); return; }

    try {
      const res = await fetch(`${baseURL}/todos/${params.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, description: form.description || null, dueDate: form.dueDate || null }),
      });
      if (!res.ok) throw new Error('更新失败');
      window.location.href = `/todos/${params.id}`;
    } catch (e: any) { setError(e.message || '请求失败'); }
  }

  return (
    <div className="container">
      <h1>编辑任务</h1>
      {error && <div className="error">{error}</div>}
      <TodoForm form={form as any} onChange={(f)=>setForm(prev=>({ ...prev, ...f }))} onSubmit={submit} submitText="保存" />
    </div>
  );
}
