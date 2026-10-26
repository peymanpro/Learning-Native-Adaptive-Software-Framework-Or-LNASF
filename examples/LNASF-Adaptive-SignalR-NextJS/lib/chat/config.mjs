export const chatConfig = {
  hubUrl: process.env.NEXT_PUBLIC_SIGNALR_HUB_URL ?? "http://localhost:5000/chat",
  maxMessageLength: 2000,
  maxUsernameLength: 32,
  maxRetainedMessages: 1000,
  typingTimeoutMs: 1400,
  lnasfMode: ["passive", "advisory", "adaptive"].includes(process.env.NEXT_PUBLIC_LNASF_MODE) ? process.env.NEXT_PUBLIC_LNASF_MODE : "passive",
};
