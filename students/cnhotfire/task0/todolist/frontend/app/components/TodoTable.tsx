import React from 'react';

import type { Todo } from '../lib/types';

type Props = {
  items: Todo[];
  loading?: boolean;
  onEdit: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function TodoTable({ items, loading = false, onEdit, onToggle, onDelete }: Props) {
  if (loading) {
    return <div className="empty">加载中...</div>;
  }
  if (!items.length) {
    return <div className="empty">暂无数据</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>标题</th>
          <th>描述</th>
          <th>状态</th>
          <th>优先级</th>
          <th>截止日期</th>
          <th>创建/更新</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {items.map(t => (
          <tr key={t.id}>
            <td>{t.title}</td>
            <td>{t.description || '-'}</td>
            <td className="status">{t.status}</td>
            <td>{t.priority}</td>
            <td>{t.dueDate || '-'}</td>
            <td>
              <small>c: {t.createdAt}</small><br />
              <small>u: {t.updatedAt}</small>
            </td>
            <td className="actions">
              <button onClick={()=>onEdit(t)}>编辑</button>
              <button onClick={()=>onToggle(t)}>{t.status === 'done' ? '设为待办' : '设为完成'}</button>
              <button onClick={()=>onDelete(t)}>删除</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
