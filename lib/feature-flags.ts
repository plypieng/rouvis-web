export type WebFeatureFlags = {
  knowledgePage: boolean;
  marketPage: boolean;
  teamPage: boolean;
};

function parseBooleanFlag(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function getWebFeatureFlags(): WebFeatureFlags {
  return {
    knowledgePage: parseBooleanFlag(
      process.env.FEATURE_KNOWLEDGE_PAGE ?? process.env.NEXT_PUBLIC_FEATURE_KNOWLEDGE_PAGE,
      false
    ),
    marketPage: parseBooleanFlag(
      process.env.FEATURE_MARKET_PAGE ?? process.env.NEXT_PUBLIC_FEATURE_MARKET_PAGE,
      false
    ),
    teamPage: parseBooleanFlag(
      process.env.FEATURE_TEAM_PAGE ?? process.env.NEXT_PUBLIC_FEATURE_TEAM_PAGE,
      false
    ),
  };
}
