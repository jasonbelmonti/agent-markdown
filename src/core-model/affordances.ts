export type AffordanceRole =
  | "work"
  | "coordination"
  | "context"
  | "policy"
  | "capability";

export type AffordanceActionability = "reference" | "plan" | "execute";

export interface ProjectedAffordances {
  role: AffordanceRole | null;
  actionability: AffordanceActionability | null;
  normativeSections: string[];
}

export interface ProfileAffordances {
  role: AffordanceRole;
  actionability: AffordanceActionability;
  normative_sections: string[];
}
