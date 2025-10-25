import 'server-only';

async function fetchTodo(id: string) {
  const res = await fetch(`http://localhost:5173/api/todos/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function TodoDetail({ params }: { params: { id: string } }) {
  const todo = await fetchTodo(params.id);
  if (!todo) return <div className="container"><h1>任务详情</h1><div className="empty">未找到</div></div>;
  return (
    <div className="container">
      <h1>任务详情</h1>
      <pre>{JSON.stringify(todo, null, 2)}</pre>
    </div>
  );
}
