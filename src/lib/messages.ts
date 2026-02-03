import { getDb } from "@/db";
import { messages } from "@/db/schema";

type MessageValues = {
  chatId: string;
  memberId?: string | null;
  role: string;
  content: string;
  tokenCount?: number;
};

export async function safeInsertMessage(values: MessageValues) {
  const db = getDb();
  try {
    await db.insert(messages).values(values);
  } catch (error) {
    if (typeof values.tokenCount === "number") {
      const rest = { ...values } as Omit<MessageValues, "tokenCount"> & {
        tokenCount?: number;
      };
      delete rest.tokenCount;
      await db.insert(messages).values(rest);
      return;
    }
    throw error;
  }
}
