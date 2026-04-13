function extractJsonCandidate(text = "") {
  const cleaned = String(text)
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

function getMessageContent(payload = {}) {
  const firstChoice = payload?.choices?.[0];
  const content = firstChoice?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object") {
          return part.text || part.content || "";
        }

        return "";
      })
      .join("");
  }

  return "";
}

export async function generateWithHuggingFaceChat({ token, model, messages, temperature = 0.3, maxTokens = 800 }) {
  if (!token) {
    return null;
  }

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    const error = new Error(errorBody?.error?.message || `Hugging Face request failed with status ${response.status}`);
    error.provider = "huggingface";
    error.status = response.status;
    error.code = errorBody?.error?.type || `http_${response.status}`;
    throw error;
  }

  const payload = await response.json();
  const content = getMessageContent(payload);
  if (!content) {
    throw new Error("Hugging Face returned an empty response");
  }

  return {
    content,
    raw: payload,
    json: JSON.parse(extractJsonCandidate(content)),
  };
}
