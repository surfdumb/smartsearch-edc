"use client";

import { useEffect, useRef } from "react";
import type { EDCData } from "@/lib/types";

/**
 * Debounced auto-save of localStorage edits to Vercel Blob.
 *
 * Uses a custom event 'edc-edit' dispatched on window to signal edits.
 * Components call `signalEdit(candidateId)` after writing to localStorage.
 * Hooks listen for these events and debounce saves.
 */

// ─── Custom event for same-tab edit signaling ──────────────────────────────
const EDIT_EVENT = 'edc-edit';

// ─── Dirty flag: auto-save only fires after a real user edit ──────────────
const dirtySet = new Set<string>();

/** Mark a candidate as having user edits so auto-save will proceed. */
export function markDirty(candidateId: string) {
  dirtySet.add(candidateId);
}

/** Clear dirty flag (e.g., on navigation or reset). */
export function clearDirty(candidateId: string) {
  dirtySet.delete(candidateId);
}

/** Call this after writing to localStorage to trigger auto-save. */
export function signalEdit(candidateId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EDIT_EVENT, { detail: { candidateId } }));
  }
}

// ─── Debounce infrastructure ───────────────────────────────────────────────
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingSaves = new Set<string>();
const DEBOUNCE_MS = 2000;

/** Collect all localStorage edits for a candidate and POST to /api/edits/save */
async function saveEdits(searchId: string, candidateId: string, baseEdc: EDCData) {
  if (!dirtySet.has(candidateId)) {
    console.log(`[auto-save] Skipped — no user edits for ${candidateId}`);
    return;
  }
  const key = `${searchId}/${candidateId}`;
  if (pendingSaves.has(key)) return;
  pendingSaves.add(key);

  try {
    const merged: EDCData = { ...baseEdc };

    // Header edits
    const headerRaw = localStorage.getItem(`edc_edit_${candidateId}_header`);
    if (headerRaw) {
      const h = JSON.parse(headerRaw);
      if (h.candidate_name) merged.candidate_name = h.candidate_name;
      if (h.current_title) merged.current_title = h.current_title;
      if (h.current_company) merged.current_company = h.current_company;
      if (h.location) merged.location = h.location;
      if (h.linkedin_url) merged.linkedin_url = h.linkedin_url;
    }

    // Scope edits
    const scopeRaw = localStorage.getItem(`edc_edit_${candidateId}_scope`);
    if (scopeRaw) merged.scope_match = JSON.parse(scopeRaw);

    // Criteria edits
    const criteriaRaw = localStorage.getItem(`edc_edit_${candidateId}_criteria`);
    if (criteriaRaw) merged.key_criteria = JSON.parse(criteriaRaw);

    // Compensation edits
    const compRaw = localStorage.getItem(`edc_edit_${candidateId}_comp`);
    if (compRaw) {
      const c = JSON.parse(compRaw);
      if (c.comp) merged.compensation = c.comp;
      if (c.notice) merged.notice_period = c.notice;
    }

    // Our Take edits
    const otRaw = localStorage.getItem(`edc_edit_${candidateId}_ourtake`);
    if (otRaw) {
      const ot = JSON.parse(otRaw);
      if (ot.fragments) merged.our_take_fragments = ot.fragments;
      if (ot.text !== undefined) merged.our_take = { ...merged.our_take, text: ot.text };
      if (ot.name && ot.showName) merged.consultant_name = ot.name;
    }

    // Motivation edits
    const motRaw = localStorage.getItem(`edc_edit_${candidateId}_motivation`);
    if (motRaw) merged.motivation_hook = motRaw;

    // Photo URL
    const photoUrl = localStorage.getItem(`edc_photo_${candidateId}`);
    if (photoUrl) merged.photo_url = photoUrl;

    // Our Take override (generated text)
    const ourTakeResult = localStorage.getItem(`edc_ourtake_result_${candidateId}`);
    if (ourTakeResult) {
      const otResult = JSON.parse(ourTakeResult);
      merged.our_take = { ...merged.our_take, ...otResult };
    }

    // IntroCard edits (status, compensation_alignment, headline, etc.)
    const cardRaw = localStorage.getItem(`card_edits_${candidateId}`);
    if (cardRaw) {
      const card = JSON.parse(cardRaw);
      if (card.status !== undefined) merged.status = card.status;
      if (card.compensation_alignment !== undefined) (merged as unknown as Record<string, unknown>).compensation_alignment = card.compensation_alignment;
      if (card.headline !== undefined) (merged as unknown as Record<string, unknown>).headline = card.headline;
      // Card-level header edits override if not already set by EDC header edits
      if (card.candidate_name && !headerRaw) merged.candidate_name = card.candidate_name;
      if (card.current_title && !headerRaw) merged.current_title = card.current_title;
      if (card.current_company && !headerRaw) merged.current_company = card.current_company;
      if (card.location && !headerRaw) merged.location = card.location;
    }

    const res = await fetch('/api/edits/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchId, candidateId, edcData: merged }),
    });
    if (res.ok) {
      console.log(`[auto-save] Saved edits for ${candidateId}`);
    } else {
      console.warn(`[auto-save] Save failed for ${candidateId}:`, res.status);
    }
  } catch (err) {
    console.warn('[auto-save] Failed:', err);
  } finally {
    pendingSaves.delete(key);
  }
}

/** Schedule a debounced save for a candidate */
function scheduleSave(searchId: string, candidateId: string, baseEdc: EDCData) {
  const key = `${searchId}/${candidateId}`;
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    saveEdits(searchId, candidateId, baseEdc);
  }, DEBOUNCE_MS));
}

/**
 * Hook: auto-save a single candidate's edits to Vercel Blob.
 * Use in DeckEDCView for the currently-viewed candidate.
 */
export function useAutoSave(searchId: string, candidateId: string, baseEdc: EDCData) {
  const baseEdcRef = useRef(baseEdc);
  baseEdcRef.current = baseEdc;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.candidateId === candidateId) {
        scheduleSave(searchId, candidateId, baseEdcRef.current);
      }
    };

    // Cross-tab storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes(candidateId)) {
        scheduleSave(searchId, candidateId, baseEdcRef.current);
      }
    };

    window.addEventListener(EDIT_EVENT, handler);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EDIT_EVENT, handler);
      window.removeEventListener('storage', handleStorage);
      // Flush any pending debounced save synchronously. If the user typed in
      // the Our Take popover (or anywhere else) then navigated to a different
      // candidate within the 2s debounce window, the scheduled timer would
      // previously fire AFTER cleanup, see !dirtySet.has(candidateId), and
      // silently skip the save. We now fire saveEdits immediately on unmount
      // and leave the dirty flag intact so the save runs to completion.
      const key = `${searchId}/${candidateId}`;
      const existing = timers.get(key);
      if (existing) {
        clearTimeout(existing);
        timers.delete(key);
        if (dirtySet.has(candidateId)) {
          saveEdits(searchId, candidateId, baseEdcRef.current);
        }
      }
    };
  }, [searchId, candidateId]);
}

/**
 * Hook: auto-save ALL candidates' edits from the grid view.
 * Listens for edc-edit events from IntroCard saves.
 */
export function useAutoSaveGrid(searchId: string, candidates: { candidate_id: string; edc_data: EDCData }[]) {
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const candidateId = detail?.candidateId;
      if (!candidateId) return;
      const candidate = candidatesRef.current.find(c => c.candidate_id === candidateId);
      if (candidate) {
        scheduleSave(searchId, candidateId, candidate.edc_data);
      }
    };

    // Cross-tab storage events
    const handleStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const match = e.key.match(/card_edits_(.+)/);
      if (match) {
        const candidateId = match[1];
        const candidate = candidatesRef.current.find(c => c.candidate_id === candidateId);
        if (candidate) {
          scheduleSave(searchId, candidateId, candidate.edc_data);
        }
      }
    };

    window.addEventListener(EDIT_EVENT, handler);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EDIT_EVENT, handler);
      window.removeEventListener('storage', handleStorage);
    };
  }, [searchId]);
}
