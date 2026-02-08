import { getActiveOrg } from "@/lib/auth";
import { getOrCreateMember } from "@/lib/organization";

export async function requireAdmin() {
  const { orgRole } = await getActiveOrg();
  if (orgRole !== "admin") {
    throw new Error("ACCESS_FORBIDDEN");
  }
  const { member, organization } = await getOrCreateMember();

  return { member, organization };
}
