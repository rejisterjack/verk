import { scimJson } from "@/lib/scim";

const RESOURCE_TYPES = [
  {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
    id: "User",
    name: "User",
    endpoint: "/Users",
    description: "A Verk user. Provisioned by email.",
    schema: "urn:ietf:params:scim:schemas:core:2.0:User",
  },
  {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
    id: "Group",
    name: "Group",
    endpoint: "/Groups",
    description:
      "A Verk team. A group's members are the team's memberships; the group itself maps to an existing team.",
    schema: "urn:ietf:params:scim:schemas:core:2.0:Group",
  },
];

export async function GET() {
  return scimJson({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: RESOURCE_TYPES.length,
    startIndex: 1,
    itemsPerPage: RESOURCE_TYPES.length,
    Resources: RESOURCE_TYPES,
  });
}
