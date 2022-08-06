import { createSignal, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal } from "solid-js/web";
import { useUser } from "../context/UserContext";
import { usePopper } from "../lib/solid-ext";
import { openBulkRenameDialog } from "./BulkRename";

const [state, setState] = createStore(null);

export const openLabelEdit = (info) => {
  setState({ ...info, isOpen: true });
};

const LabelEdit = () => {
  const { getLabelInfo } = useUser();
  const [info, setInfo] = getLabelInfo(state.label);
  return (
    <div class="w-40 bg-white rounded shadow text-gray-800 text-sm">
      <div class="text-gray-500 text-[10px] px-2 pt-1">{state.label}</div>
      <div class="divide-y divide-gray-200">
        <div class="px-2 h-6 w-full">
          <div class="flex items-center space-x-1">
            <div>Color: </div>
            <input
              class="w-5 h-5"
              type="color"
              value={info.color}
              onchange={(e) => setInfo({ color: e.currentTarget.value })}
            />
          </div>
        </div>
        <button
          class="hover:bg-gray-100 px-2 h-7 w-full text-left"
          onclick={() => {
            openBulkRenameDialog({ label: state.label });
          }}
        >
          Bulk rename
        </button>
        <button class="hover:bg-gray-100 px-2 h-7 w-full text-left">
          Jump to Track
        </button>
      </div>
    </div>
  );
};

export const LabelEditContextMenu = () => {
  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const [popper, setPopper] = createSignal<HTMLElement>();
  usePopper(anchor, popper, { placement: "right-start" });

  onMount(() => {
    document.addEventListener("click", (e) => {
      setState({ isOpen: false });
    });
  });

  return (
    <Show when={state.isOpen}>
      <Portal>
        <div
          ref={setAnchor}
          class="absolute z-50"
          style={{ top: state.coord[1] + "px", left: state.coord[0] + "px" }}
        >
          <div ref={setPopper}>
            <LabelEdit />
          </div>
        </div>
      </Portal>
    </Show>
  );
};
