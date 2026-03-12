export interface Admin {
  id: number;
  name: string;
  email: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('crm_token');
}

export function getAdmin(): Admin | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('crm_admin');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export function setAuth(token: string, admin: Admin) {
  localStorage.setItem('crm_token', token);
  localStorage.setItem('crm_admin', JSON.stringify(admin));
}

export function clearAuth() {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_admin');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
