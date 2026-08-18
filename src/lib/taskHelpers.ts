import { dataService } from './dataService';
import { safeUUID } from './storage';
import { addNotification } from './notificationHelpers';

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface QuickTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
}

// Cria uma tarefa direto no quadro de Tarefas a partir de qualquer lugar do
// sistema (ex: entrada de aparelho seminovo no Estoque). Nunca lança erro —
// se falhar, a operação que chamou (ex: cadastrar produto) não deve travar
// por causa disso.
export async function addQuickTask(input: QuickTaskInput): Promise<boolean> {
  try {
    const board = await dataService.getTasksBoard();
    const tasks = Array.isArray(board) ? board : [];
    const now = new Date().toISOString();
    const newTask = {
      id: safeUUID(),
      title: input.title,
      description: input.description || '',
      status: input.status || 'todo',
      priority: input.priority || 'media',
      due_date: input.due_date || '',
      archived: false,
      created_at: now,
      updated_at: now,
    };
    await dataService.saveTasksBoard([...tasks, newTask]);
    addNotification({ type: 'tarefa_nova', title: 'Nova tarefa criada', message: newTask.title, link: '/tarefas' }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
