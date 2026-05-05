import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { speechToText } from "@workspace/integrations-openai-ai-server/audio";

const router = Router();

// POST /api/voice-dictation/transcribe
router.post("/voice-dictation/transcribe", async (req, res) => {
  try {
    const { audio, mimeType } = req.body as { audio: string; mimeType?: string };
    if (!audio) {
      res.status(400).json({ error: "audio is required" });
      return;
    }
    const buffer = Buffer.from(audio, "base64");
    const transcript = await speechToText(buffer, "webm");
    res.json({ transcript });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحويل الصوت إلى نص" });
  }
});

// POST /api/voice-dictation/enhance
router.post("/voice-dictation/enhance", async (req, res) => {
  try {
    const { text, documentType } = req.body as { text: string; documentType: string };
    if (!text || !documentType) {
      res.status(400).json({ error: "text and documentType are required" });
      return;
    }

    const systemPrompt = `أنت مساعد قانوني متخصص في صياغة الوثائق القانونية التونسية.
مهمتك: تحويل النص المُملى إلى وثيقة قانونية مهيكلة ومحترفة.
نوع الوثيقة: ${documentType}
التعليمات:
- استخدم اللغة العربية القانونية الرسمية
- هيكل النص بشكل واضح مع عناوين ومقاطع منطقية
- أضف الصياغات القانونية المناسبة للسياق التونسي
- احتفظ بالمعنى الأصلي مع تحسين الأسلوب
- استخدم المصطلحات القانونية الصحيحة`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `حوّل هذا النص إلى وثيقة قانونية مهيكلة:\n\n${text}` },
      ],
    });

    const enhanced = response.choices[0]?.message?.content ?? text;
    res.json({ enhanced });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحسين النص بالذكاء الاصطناعي" });
  }
});

export default router;
