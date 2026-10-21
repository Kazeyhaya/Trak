const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// Explica por que o nome de usuario digitado nao e aceito.
export function problemaUsername(valor: string) {
  const normalizado = valor.trim().toLowerCase();
  if (normalizado.includes("@")) {
    return "Use um nome de usuário, não o seu e-mail (ex.: alex_allen).";
  }
  if (normalizado.length < 3) {
    return "Use pelo menos 3 caracteres.";
  }
  if (normalizado.length > 20) {
    return "Use no máximo 20 caracteres.";
  }
  return USERNAME_PATTERN.test(normalizado) ? null : "Use só letras sem acento, números ou _ (sem espaços ou pontos).";
}
