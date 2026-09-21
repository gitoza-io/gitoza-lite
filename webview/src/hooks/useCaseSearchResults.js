import { useEffect, useState } from "react";
import { chipsToCaseQueryParams, fetchAllCases } from "../utils/caseQuery";
import { itemMatchesSearchChips } from "../utils/querySearch";

/** Stable empty chips reference for callers that toggle search on/off. */
export const EMPTY_SEARCH_CHIPS = [];

function chipsDepKey(chips) {
  if (!chips?.length) return "";
  return JSON.stringify(chips);
}

/**
 * Case search driven by SearchPanel / TreeQuerySearchBar chips.
 * Host listCases ignores most query params, so results are filtered client-side.
 *
 * @param {string|null} repoSlug
 * @param {Array<{ key: string, value: string }>} chips
 * @param {{ paramKeys?: string[], searchKeys?: Array }} [matchOpts]
 * @returns {{ results: Array<object>, loading: boolean, setResults: Function }}
 */
export function useCaseSearchResults(repoSlug, chips, matchOpts = {}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const chipsKey = chipsDepKey(chips);
  const matchKey = JSON.stringify({
    paramKeys: matchOpts.paramKeys ?? [],
    searchKeyTypes: (matchOpts.searchKeys || []).map((k) => `${k.key}:${k.type}`),
  });

  useEffect(() => {
    if (!repoSlug || !chipsKey) {
      setResults((prev) => (prev.length === 0 ? prev : []));
      setLoading((prev) => (prev ? false : prev));
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const params = chipsToCaseQueryParams(chips);
    fetchAllCases(repoSlug, params)
      .then((rows) => {
        if (cancelled) return;
        const filtered = (rows || []).filter((row) =>
          itemMatchesSearchChips(row, chips, {
            queryFields: ["case_id", "title"],
            paramKeys: matchOpts.paramKeys,
            searchKeys: matchOpts.searchKeys,
          }),
        );
        setResults(filtered);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // matchKey tracks paramKeys/searchKeys; chipsKey tracks chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoSlug, chipsKey, matchKey]);

  return { results, loading, setResults };
}
