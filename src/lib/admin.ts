import { getOrCreateMember } from "@/lib/organization";

export async function requireAdmin() {
  const { member, organization } = await getOrCreateMember();

  if (member.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { member, organization };
}
