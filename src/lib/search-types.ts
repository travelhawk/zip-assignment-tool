export type SearchMode = "postal-exact" | "postal-prefix" | "city";

export type SearchResult = {
  postalCode: string;
  assigneeName: string;
  localities: string[];
  adminAreas: string[];
  secondaryAreas: string[];
};

export type SearchResponse = {
  mode: SearchMode;
  results: SearchResult[];
};
