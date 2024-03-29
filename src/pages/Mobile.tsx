import axios from "axios";
import { useNavigate } from "solid-app-router";
import {
  Component,
  createEffect,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch
} from "solid-js";
import { createStore } from "solid-js/store";
import { useWindow } from "../context/WindowContext";
import { serializeEntries } from "../lib/entries";
import { renderTime } from "../lib/format";

function newUID() {
  return Math.random().toString(36).substring(2, 10);
}

function makeEntry() {
  return {
    before: "",
    after: "",
    time: new Date(),
    id: newUID(),
    lastModified: new Date(),
    deleted: false,
  };
}

const deserializeEntryPairs = (s) => {
  return JSON.parse(s).map(([x, sent]) => {
    const time = new Date(x.time);
    const lastModified = new Date(x.lastModified);
    const before: string | undefined =
      typeof x.before == "string" ? x.before : undefined;
    const after: string | undefined =
      typeof x.after == "string" ? x.after : undefined;
    const deleted: boolean = typeof x.deleted == "boolean" ? x.deleted : false;
    const id = x.id;
    return [
      {
        time,
        lastModified,
        before,
        after,
        deleted,
        id,
      },
      sent == 1 ? true : false,
    ];
  });
};

const serializeEntryPairs = (pairs) => {
  return JSON.stringify(
    pairs.map(([x, sent]) => {
      return [
        {
          ...x,
          time: x.time.getTime(),
          lastModified: x.lastModified.getTime(),
        },
        sent ? 1 : 0,
      ];
    })
  );
};

const Mobile: Component = () => {
  const { hasNetwork } = useWindow();
  const navigate = useNavigate();
  const credentials = JSON.parse(
    localStorage.getItem("user") as any
  )?.credentials;
  if (!credentials) {
    navigate("/login", { state: { redirect: "/" } });
    return null;
  }

  const [entryPairs, setEntryPairs] = createStore(
    (localStorage.getItem("entries")
      ? deserializeEntryPairs(localStorage.getItem("entries"))
      : []
    ).filter(([x, sent]) => !sent)
  );

  const [sending, setSending] = createSignal(false);
  const sync = async () => {
    if (!hasNetwork) return;
    setSending(true);
    const entries = entryPairs.reduce(
      (es, [entry, sent]) => (!sent ? [...es, entry] : es),
      []
    );

    const response = await axios.post(
      "/api/update",
      "entries=" + encodeURIComponent(serializeEntries(entries)),
      { params: credentials }
    );
    if (response.data.status === "ok") {
      setEntryPairs(
        entryPairs
          .map((entryPair) =>
            entries.some((e) => e.id === entryPair[0].id)
              ? [entryPair[0], true]
              : entryPair
          )
          .slice(0, 5)
      );
      localStorage.setItem("entries", serializeEntryPairs(entryPairs));
    }
    setSending(false);
  };

  const onclick = () => {
    const entry = makeEntry();
    // add entry to local storage
    setEntryPairs([[entry, false], ...entryPairs].slice(0, 5));
    localStorage.setItem("entries", serializeEntryPairs(entryPairs));

    sync();
  };

  onMount(sync);

  createEffect(() => {
    if (hasNetwork()) {
      sync();
    }
  });

  return (
    <div class="h-screen">
      <div class="h-1/2 px-4 pt-2">
        <div class="flex justify-end w-full text-xs space-x-2">
          <span class="text-gray-300 mr-2">
            <Switch>
              <Match when={!hasNetwork()}>No internet.</Match>
              <Match when={sending()}>Sending updates...</Match>
            </Switch>
          </span>
          <span class="text-gray-500">({credentials.username})</span>
          <button
            class="underline"
            onClick={() => {
              localStorage.removeItem("user");
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
        <div class="h-4" />
        <For each={entryPairs}>
          {(entryPair) => {
            const entry = () => entryPair[0];
            const sent = () => entryPair[1];
            const [ok, setOk] = createSignal(sent());

            setTimeout(() => setOk(false), 1000);
            return (
              <div
                class={
                  "flex items-center space-x-2 " + (sent() && "text-gray-300")
                }
              >
                <div class="flex justify-center items-center w-3 h-3">
                  <div
                    class={
                      "w-1.5 h-1.5 rounded-full " +
                      (sent() ? "bg-gray-300" : "bg-gray-800")
                    }
                  />
                </div>
                <div class="text-sm font-bold">
                  {renderTime(entry().time)}
                  <span class="text-[8px] font-norma">
                    :{entry().time.getSeconds()}
                  </span>
                  <Show when={ok()}>
                    <span class="ml-2 text-xs">Sent!</span>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
      <div class="h-1/2">
        <div class="w-full flex justify-end pr-4">
          <Show when={entryPairs.filter(([_, sent]) => !sent).length > 0}>
            <button
              class="px-3 py-2 text-xs hover:bg-gray-100 active:bg-gray-200 active-shadow rounded border"
              onclick={() => sync()}
            >
              Retry
            </button>
          </Show>
        </div>
        <div class="h-full flex justify-center items-center">
          <button
            class="px-12 py-6 text-lg hover:bg-gray-100 active:bg-gray-200 active:shadow rounded border-2 border-black"
            onclick={onclick}
          >
            Add entry
          </button>
        </div>
      </div>
    </div>
  );
};

export default Mobile;
