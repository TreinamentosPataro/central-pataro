/**
 * Roda uma vez quando a Central sobe. Liga o envio pelo WhatsApp a cada minuto (sem WHATSAPP_URL, não faz nada)
 * e a conferência da pasta de contratos a cada 10 minutos (sem a chave do robô e a pasta, não faz nada).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ligarRodadaWhatsapp } = await import('./lib/rodada-whatsapp')
    ligarRodadaWhatsapp()
    const { ligarRodadaContratos } = await import('./lib/rodada-contratos')
    ligarRodadaContratos()
  }
}
