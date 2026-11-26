import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { parseContent, type ContentSnapshot } from "@/data/content";
import { contentEditUploads, editedContentRecords, parseContentEdits, type ContentEdit, type ContentEdits, type ContentEditState } from "@/data/content-edits";

const columns = "revision,draft,published";

function readState(row: ContentEditState): ContentEditState {
  return { ...row, draft: parseContentEdits(row.draft), published: parseContentEdits(row.published) };
}

export type ContentAdmin = {
  snapshot: ContentSnapshot;
  edits: ContentEdits;
  hasUnpublishedChanges: boolean;
  save: (slug: string, patch: ContentEdit) => Promise<void>;
  reorder: (order: string[]) => Promise<void>;
  preparePublish: () => Promise<void>;
};

export function useContentAdmin(db: SupabaseClient, source: string | undefined) {
  const [loaded, setLoaded] = useState<{ snapshot: ContentSnapshot; state: ContentEditState }>();
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const locked = useRef(false);

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    void Promise.all([
      fetch(source, { signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("공개 음식의 원본을 가져오지 못했어요.");
        return parseContent(await response.json());
      }),
      db.from("content_edits").select(columns).eq("id", 1).abortSignal(controller.signal).single(),
    ]).then(([snapshot, { data, error }]) => {
      if (controller.signal.aborted) return;
      if (error) throw new Error(error.message);
      const state = readState(data as ContentEditState);
      editedContentRecords(snapshot, state.draft, contentEditUploads(state.draft));
      setLoaded({ snapshot, state });
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setLoadError(error.message);
    });
    return () => controller.abort();
  }, [attempt, db, source]);

  if (!loaded) return { loadError, retry: () => { setLoadError(""); setAttempt((value) => value + 1); } };

  const { snapshot, state } = loaded;
  async function write(change: { draft?: ContentEdits; published?: ContentEdits }) {
    if (locked.current) throw new Error("앞선 저장이 끝난 뒤 다시 눌러 주세요.");
    locked.current = true;
    try {
      const { data, error } = await db.from("content_edits")
        .update({ ...change, revision: state.revision + 1 }).eq("id", 1).eq("revision", state.revision)
        .select(columns).maybeSingle();
      if (error) throw new Error(error.message);
      if (data) {
        setLoaded({ snapshot, state: readState(data as ContentEditState) });
        return;
      }
      const latest = await db.from("content_edits").select(columns).eq("id", 1).single();
      if (latest.data) setLoaded({ snapshot, state: readState(latest.data as ContentEditState) });
      throw new Error("다른 관리자가 먼저 저장했어요. 변경 내용을 확인한 뒤 다시 저장해 주세요.");
    } finally {
      locked.current = false;
    }
  }

  function saveDraft(edits: ContentEdits) {
    editedContentRecords(snapshot, parseContentEdits(edits), contentEditUploads(edits));
    return write({ draft: edits });
  }

  const content: ContentAdmin = {
    snapshot,
    edits: state.draft,
    hasUnpublishedChanges: JSON.stringify(state.draft) !== JSON.stringify(state.published),
    save: async (slug, patch) => {
      if (!Object.keys(patch).length) return;
      await saveDraft({ ...state.draft, foods: { ...state.draft.foods, [slug]: { ...state.draft.foods[slug], ...patch } } });
    },
    reorder: (order) => saveDraft({ ...state.draft, order }),
    preparePublish: async () => {
      // 이전에 선택한 업로드 사진이 아직 있는지 다시 확인한다.
      const uploads = contentEditUploads(state.draft);
      const registered: string[] = [];
      for (let index = 0; index < uploads.length; index += 100) {
        const { data, error } = await db.from("photos").select("id").in("id", uploads.slice(index, index + 100));
        if (error) throw new Error(error.message);
        registered.push(...(data ?? []).map((photo) => photo.id));
      }
      editedContentRecords(snapshot, state.draft, registered);
      await write({ published: state.draft });
    },
  };
  return { content };
}
