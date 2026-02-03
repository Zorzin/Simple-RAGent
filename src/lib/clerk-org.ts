type MembershipItem = {
  id: string;
  userId: string;
  identifier: string;
  role: string;
};

type InvitationItem = {
  id: string;
  emailAddress: string;
  role: string;
};

export async function fetchOrgMemberships(orgId: string): Promise<MembershipItem[]> {
  if (!process.env.CLERK_SECRET_KEY) {
    return [];
  }

  const response = await fetch(`https://api.clerk.com/v1/organizations/${orgId}/memberships`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as {
    data?: Array<{
      id: string;
      role: string;
      public_user_data?: { user_id?: string; identifier?: string };
    }>;
  };

  return (
    json.data?.map((item) => ({
      id: item.id,
      userId: item.public_user_data?.user_id ?? "",
      identifier: item.public_user_data?.identifier ?? "",
      role: item.role,
    })) ?? []
  );
}

export async function fetchOrgInvitations(orgId: string): Promise<InvitationItem[]> {
  if (!process.env.CLERK_SECRET_KEY) {
    return [];
  }

  const response = await fetch(
    `https://api.clerk.com/v1/organizations/${orgId}/invitations?status=pending`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as {
    data?: Array<{
      id: string;
      role: string;
      email_address?: string;
      status?: string;
    }>;
  };

  return (
    json.data
      ?.filter((item) => item.status === "pending" || !item.status)
      .map((item) => ({
        id: item.id,
        emailAddress: item.email_address ?? "",
        role: item.role,
      })) ?? []
  );
}
