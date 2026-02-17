// Auth stub — returns authenticated consultant for v1.0
// Will be replaced with real auth when client portal arrives

export function getAuth() {
  return {
    authenticated: true,
    role: 'consultant' as const,
  };
}
