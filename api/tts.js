// API Route sécurisée pour ElevenLabs TTS
export default async function handler(req, res) {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { text } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texte requis' });
    }

    if (text.length > 2500) {
      return res.status(400).json({ error: 'Texte trop long (max 2500 caractères)' });
    }

    // Récupérer la clé API depuis les variables d'environnement (côté serveur)
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
      console.error('Clé API ElevenLabs manquante');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // Configuration ElevenLabs
    const VOICE_ID = "g5CIjZEefAph4nQFvHAz"; // Voix française Emilie
    
    console.log('🔊 Génération TTS pour:', text.substring(0, 50) + '...');

    // Appel à l'API ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erreur ElevenLabs:', response.status, errorData);
      return res.status(response.status).json({ 
        error: `API Error: ${errorData.detail || 'Erreur inconnue'}` 
      });
    }

    // Récupérer le fichier audio
    const audioBuffer = await response.arrayBuffer();
    
    console.log('✅ Audio généré avec succès');

    // Retourner l'audio en base64 pour le frontend
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    res.status(200).json({ 
      success: true, 
      audio: base64Audio,
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('Erreur serveur TTS:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message 
    });
  }
}
