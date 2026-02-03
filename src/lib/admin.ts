import { getActiveOrg } from "@/lib/auth";
import { getOrCreateMember } from "@/lib/organization";

export async function requireAdmin() {
  const { orgRole } = await getActiveOrg();
  if (orgRole !== "org:admin") {
    throw new Error("Forbidden");
  }
  const { member, organization } = await getOrCreateMember();

  return { member, organization };
}
