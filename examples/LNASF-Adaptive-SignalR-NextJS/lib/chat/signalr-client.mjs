import * as signalR from "@microsoft/signalr";
import { AdaptiveRetryPolicy, normalizeLnasfMode } from "./lnasf-retry-policy.ts";

export function createChatConnection(hubUrl, { mode = "passive", onMetricsChange } = {}) {
  const retryPolicy = new AdaptiveRetryPolicy({
    mode: normalizeLnasfMode(mode),
    onMetricsChange,
  });
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (context) => retryPolicy.nextRetryDelay({
        previousRetryCount: context.previousRetryCount,
        elapsedMilliseconds: context.elapsedMilliseconds,
        retryReason: context.retryReason,
      }),
    })
    .configureLogging(process.env.NODE_ENV === "development" ? signalR.LogLevel.Information : signalR.LogLevel.Warning)
    .build();

  return { connection, retryPolicy };
}
