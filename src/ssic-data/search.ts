// search.ts
// Search and lookup functions for SSIC records

import { SsicRecord, SsicSearchResult } from './types';

// Data will be imported from generated files
let allRecords: SsicRecord[] = [];

/**
 * Initialize with record data
 */
export function initializeData(records: SsicRecord[]): void {
  allRecords = records;
}

/**
 * Search by topic text or SSIC code
 */
export function search(query: string): SsicSearchResult[] {
  const trimmed = query.trim();
  
  if (!trimmed || trimmed.length < 2) {
    return [];
  }
  
  // Numeric query = SSIC code
  if (/^\d+$/.test(trimmed)) {
    return searchBySsic(trimmed);
  }
  
  // Text query = nomenclature search
  return searchByNomenclature(trimmed);
}

/**
 * Search by SSIC code
 */
function searchBySsic(code: string): SsicSearchResult[] {
  const results: Map<string, SsicRecord[]> = new Map();
  
  // Exact match
  for (const record of allRecords) {
    if (record.ssic === code) {
      if (!results.has(record.ssic)) {
        results.set(record.ssic, []);
      }
      results.get(record.ssic)!.push(record);
    }
  }
  
  // Partial match if no exact
  if (results.size === 0) {
    for (const record of allRecords) {
      if (record.ssic.startsWith(code)) {
        if (!results.has(record.ssic)) {
          results.set(record.ssic, []);
        }
        results.get(record.ssic)!.push(record);
      }
    }
  }
  
  return buildSearchResults(results, 15);
}

/**
 * Search by nomenclature text
 */
function searchByNomenclature(query: string): SsicSearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  if (words.length === 0) return [];
  
  const results: Map<string, SsicRecord[]> = new Map();
  const scores: Map<string, number> = new Map();
  
  for (const record of allRecords) {
    const nom = record.nomenclature.toLowerCase();
    let score = 0;
    
    // Exact phrase match
    if (nom.includes(query.toLowerCase())) {
      score += 100;
    }
    
    // Word matches
    for (const word of words) {
      if (nom.includes(word)) {
        score += 10;
        if (nom.startsWith(word)) score += 5;
      }
    }
    
    if (score > 0) {
      if (!results.has(record.ssic)) {
        results.set(record.ssic, []);
        scores.set(record.ssic, score);
      }
      results.get(record.ssic)!.push(record);
      
      // Keep highest score
      if (score > (scores.get(record.ssic) || 0)) {
        scores.set(record.ssic, score);
      }
    }
  }
  
  // Sort by score
  const sorted = Array.from(results.keys()).sort((a, b) => {
    const scoreA = scores.get(a) || 0;
    const scoreB = scores.get(b) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return parseInt(a) - parseInt(b);
  });
  
  const sortedResults: Map<string, SsicRecord[]> = new Map();
  for (const ssic of sorted.slice(0, 15)) {
    sortedResults.set(ssic, results.get(ssic)!);
  }
  
  return buildSearchResults(sortedResults, 15);
}

/**
 * Build search results with primary record selection
 */
function buildSearchResults(
  recordMap: Map<string, SsicRecord[]>,
  limit: number
): SsicSearchResult[] {
  const results: SsicSearchResult[] = [];
  
  for (const [ssic, records] of recordMap) {
    if (results.length >= limit) break;
    
    // Select primary record (prefer General Correspondence)
    const primary = records.find(r =>
      r.bucketTitle.toLowerCase().includes('general correspondence') ||
      r.bucketTitle.toLowerCase().includes('general operations')
    ) || records[0];
    
    results.push({
      ssic,
      nomenclature: records[0].nomenclature,
      records,
      primaryRecord: primary
    });
  }
  
  return results;
}

/**
 * Get all records for a specific SSIC
 */
export function getRecordsForSsic(ssicCode: string): SsicRecord[] {
  return allRecords.filter(r => r.ssic === ssicCode);
}

/**
 * Get primary record for a specific SSIC
 */
export function getPrimaryRecord(ssicCode: string): SsicRecord | null {
  const records = getRecordsForSsic(ssicCode);
  if (records.length === 0) return null;
  
  return records.find(r =>
    r.bucketTitle.toLowerCase().includes('general correspondence') ||
    r.bucketTitle.toLowerCase().includes('general operations')
  ) || records[0];
}

/**
 * Get all unique SSIC codes
 */
export function getAllSsicCodes(): string[] {
  const codes = new Set(allRecords.map(r => r.ssic));
  return Array.from(codes).sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Validate if SSIC code exists
 */
export function isValidSsic(code: string): boolean {
  return allRecords.some(r => r.ssic === code);
}
