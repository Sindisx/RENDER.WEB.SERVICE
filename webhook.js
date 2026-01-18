const WEBHOOK_URL = "https://discord.com/api/webhooks/1462398256632955047/6zIBGMyPKQH9VfqKK3mV4kTuQnNVFHNNpYPsI5Er_qkoN1JgFu0iLRQe1ScMrY9F3lWt";

async function sendWebhook() {
  const payload = {
  username: "Системный Голос",
  avatar_url: "https://i.imgur.com/xxxx.png",
  content: "Что-то произошло. Я не виноват."
};

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error("Discord недоволен:", res.status);
  } else {
    console.log("Сообщение улетело. Гордимся.");
  }
}

sendWebhook();