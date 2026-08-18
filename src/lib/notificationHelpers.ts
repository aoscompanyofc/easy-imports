import { dataService } from './dataService';
import { safeUUID } from './storage';

export type NotificationType =
  | 'venda' | 'troca' | 'prazo' | 'venda_cancelada'
  | 'cliente_novo' | 'cliente_removido' | 'tarefa_nova';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

const MAX_NOTIFICATIONS = 60;

// Registra um evento na Central de Notificações a partir de qualquer lugar
// do sistema. Nunca lança erro — a operação que chamou (venda, cadastro de
// cliente, etc.) não deve travar por causa de uma notificação.
export async function addNotification(input: {
  type: NotificationType; title: string; message: string; link?: string;
}): Promise<boolean> {
  try {
    const list = await dataService.getNotifications();
    const items = Array.isArray(list) ? list : [];
    const notification: AppNotification = {
      id: safeUUID(),
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link || '',
      read: false,
      created_at: new Date().toISOString(),
    };
    const next = [notification, ...items].slice(0, MAX_NOTIFICATIONS);
    await dataService.saveNotifications(next);
    return true;
  } catch {
    return false;
  }
}
