export function formatTicketProtocol(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}
