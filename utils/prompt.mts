export function addConversationMessage(conversation: string, message: string, role: string) {
  return `${conversation}\n${role.toUpperCase()}: ${message}`;
}
