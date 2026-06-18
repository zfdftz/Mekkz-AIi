/**
 * Serializes chat API work per user so parallel sends do not stack Groq TPM usage.
 */
const tails = new Map<string, Promise<void>>();

export function enqueueUserChatRequest<T>(
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = tails.get(userId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(() => task());
  tails.set(
    userId,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}
