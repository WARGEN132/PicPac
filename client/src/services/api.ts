import { Product, Project, Order, SupportTicket, PhotobookDocument, AuthUser } from '../types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Ошибка связи с сервером');
  return res.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error('Ошибка загрузки каталога продукции');
  const json = await res.json();
  return json.data;
}

export async function fetchProjects(userId: string, isOperator = false): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects?userId=${encodeURIComponent(userId)}${isOperator ? '&role=operator' : ''}`);
  if (!res.ok) throw new Error('Ошибка загрузки проектов');
  const json = await res.json();
  return json.data;
}

export async function fetchProjectById(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error('Проект не найден');
  const json = await res.json();
  return json.data;
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Ошибка создания проекта');
  const json = await res.json();
  return json.data;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<{ id: string; updatedAt: string }> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Ошибка сохранения проекта');
  const json = await res.json();
  return json.data;
}

export async function duplicateProject(id: string): Promise<{ id: string; title: string }> {
  const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Ошибка дублирования проекта');
  const json = await res.json();
  return json.data;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Ошибка удаления проекта');
}

export async function generateBookAI(params: {
  photos: string[];
  theme: string;
  style: string;
  format: string;
  coverType: string;
  title: string;
  customPrompt?: string;
}): Promise<PhotobookDocument> {
  const res = await fetch(`${API_BASE}/ai/generate-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Ошибка генерации фотокниги ИИ');
  const json = await res.json();
  return json.data;
}

export async function sendAIEditCommand(params: {
  document: PhotobookDocument;
  currentSpreadIndex: number;
  command: string;
}): Promise<{ updatedDocument: PhotobookDocument; message: string; modifiedSpreadIndex: number }> {
  const res = await fetch(`${API_BASE}/ai/edit-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Ошибка обработки команды ИИ');
  const json = await res.json();
  return {
    updatedDocument: json.data,
    message: json.message,
    modifiedSpreadIndex: json.modifiedSpreadIndex
  };
}

export async function fetchOrders(userId: string, isOperator = false): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders?userId=${encodeURIComponent(userId)}${isOperator ? '&role=operator' : ''}`);
  if (!res.ok) throw new Error('Ошибка загрузки заказов');
  const json = await res.json();
  return json.data;
}

export async function fetchOrderById(id: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  if (!res.ok) throw new Error('Заказ не найден');
  const json = await res.json();
  return json.data;
}

export async function createOrder(orderData: any, idempotencyKey?: string): Promise<{ id: string; orderNumber: string; totalAmount: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...orderData, idempotencyKey })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ошибка оформления заказа');
  }
  const json = await res.json();
  return json.data;
}

export async function updateOrderStatus(orderId: string, status: string, comment = '', operatorUserId = 'usr-test-operator-001'): Promise<void> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, comment, operatorUserId })
  });
  if (!res.ok) throw new Error('Ошибка смены статуса');
}

export async function fetchTickets(userId?: string, isOperator = false): Promise<SupportTicket[]> {
  const url = `${API_BASE}/support/tickets?${isOperator ? 'role=operator' : `userId=${encodeURIComponent(userId || '')}`}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка загрузки обращений');
  const json = await res.json();
  return json.data;
}

export async function createTicket(ticketData: { orderId?: string; userId: string; subject: string; message: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/support/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData)
  });
  if (!res.ok) throw new Error('Ошибка отправки обращения');
  return res.json();
}

export async function fetchAuditLogs(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/audit-logs`);
  if (!res.ok) throw new Error('Ошибка загрузки журнала аудита');
  const json = await res.json();
  return json.data;
}

export async function purgeUserData(userId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/privacy/purge-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error('Ошибка удаления данных');
  const json = await res.json();
  return json.message;
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ошибка входа');
  }
  const json = await res.json();
  return json.user;
}

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role?: 'customer' | 'operator';
}): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ошибка регистрации');
  }
  const json = await res.json();
  return json.user;
}

export async function loginAnonymous(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Ошибка создания гостевой сессии');
  const json = await res.json();
  return json.user;
}

export async function fetchTestUsers(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/auth/test-users`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.accounts || [];
}


