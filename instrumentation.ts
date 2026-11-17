/** Roda uma vez quando a Central sobe. Liga o envio pelo WhatsApp a cada minuto (sem WHATSAPP_URL, não faz nada). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ligarRodadaWhatsapp } = await import('./lib/rodada-whatsapp')
    ligarRodadaWhatsapp()
  }
}
