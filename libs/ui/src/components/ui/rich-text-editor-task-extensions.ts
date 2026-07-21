import { mergeAttributes } from "@tiptap/core";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";

function isWrikeChecklistUl(element: HTMLElement): boolean {
  return (
    element.classList.contains("checklist") || element.getAttribute("data-type") === "taskList"
  );
}

/** Read checked state from Wrike's `data-checked` attribute and/or nested checkbox input. */
export function parseCheckedFromLi(element: HTMLElement): boolean | null {
  const dataChecked = element.getAttribute("data-checked");
  if (dataChecked === "false") return false;
  if (dataChecked === "true" || dataChecked === "") return true;

  const checkbox = element.querySelector(
    ':scope > label > input[type="checkbox"], :scope > input[type="checkbox"]',
  );
  if (checkbox instanceof HTMLInputElement) {
    return checkbox.checked || checkbox.hasAttribute("checked");
  }

  if (dataChecked !== null) return false;

  const parent = element.parentElement;
  if (parent && isWrikeChecklistUl(parent)) {
    return false;
  }

  return null;
}

/** Parses Wrike checklist HTML (`ul.checklist` + `li[data-checked]`). */
export const WrikeTaskList = TaskList.extend({
  parseHTML() {
    return [
      { tag: "ul.checklist", priority: 52 },
      {
        tag: "ul",
        priority: 52,
        getAttrs: (element) => (isWrikeChecklistUl(element) ? {} : false),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: "checklist" }),
      0,
    ];
  },
});

/** Parses Wrike checklist items and emits `data-checked="true|false"` on save. */
export const WrikeTaskItem = TaskItem.extend({
  addAttributes() {
    return {
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: (element) => parseCheckedFromLi(element) ?? false,
        renderHTML: (attributes) => ({
          "data-checked": attributes.checked ? "true" : "false",
        }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: "li[data-checked]", priority: 52 },
      {
        tag: "li",
        priority: 52,
        getAttrs: (element) => {
          if (!element.closest("ul.checklist, ul[data-type='taskList']")) {
            return false;
          }
          const checked = parseCheckedFromLi(element);
          return checked === null ? false : { checked };
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-checked": node.attrs.checked ? "true" : "false",
      }),
      0,
    ];
  },
});

function isChecklistUlElement(element: Element): boolean {
  return (
    element instanceof HTMLUListElement &&
    (element.classList.contains("checklist") || element.getAttribute("data-type") === "taskList")
  );
}

function isCheckboxElement(node: Node): node is HTMLInputElement {
  return node instanceof HTMLInputElement && node.type === "checkbox";
}

/** Rewrite checklist items into the label/input shape Wrike persists on save. */
function rewriteChecklistItem(li: HTMLLIElement, doc: Document): void {
  const checked = parseCheckedFromLi(li) ?? false;
  li.setAttribute("data-checked", checked ? "true" : "false");

  const nestedLists: HTMLElement[] = [];
  const textNodes: Node[] = [];

  const collectNodes = (container: Node) => {
    Array.from(container.childNodes).forEach((node) => {
      if (node instanceof HTMLElement) {
        if (node.tagName === "UL" || node.tagName === "OL") {
          nestedLists.push(node);
          return;
        }
        if (node.tagName === "DIV") {
          collectNodes(node);
          return;
        }
        if (node.tagName === "LABEL") {
          Array.from(node.childNodes).forEach((child) => {
            if (isCheckboxElement(child)) return;
            textNodes.push(child);
          });
          return;
        }
        if (isCheckboxElement(node)) return;
      }
      textNodes.push(node);
    });
  };

  collectNodes(li);

  while (li.firstChild) li.removeChild(li.firstChild);

  const label = doc.createElement("label");
  const input = doc.createElement("input");
  input.type = "checkbox";
  if (checked) input.setAttribute("checked", "checked");
  label.appendChild(input);

  for (const node of textNodes) {
    if (node instanceof HTMLElement && node.tagName === "P") {
      while (node.firstChild) label.appendChild(node.firstChild);
      continue;
    }
    label.appendChild(node);
  }

  li.appendChild(label);
  for (const nested of nestedLists) {
    li.appendChild(nested);
    if (nested instanceof HTMLUListElement && isChecklistUlElement(nested)) {
      normalizeChecklistUl(nested, doc);
    }
  }
}

function normalizeChecklistUl(ul: HTMLUListElement, doc: Document): void {
  ul.classList.add("checklist");
  ul.removeAttribute("data-type");
  Array.from(ul.children).forEach((child) => {
    if (child instanceof HTMLLIElement) rewriteChecklistItem(child, doc);
  });
}

/** Convert TipTap checklist HTML into the structure Wrike keeps after API updates. */
export function normalizeChecklistHtmlForWrike(html: string): string {
  if (typeof document === "undefined") return html;
  if (!html.includes("checklist") && !html.includes("data-checked")) return html;

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.body.querySelectorAll("ul.checklist, ul[data-type='taskList']").forEach((ul) => {
    if (ul instanceof HTMLUListElement) normalizeChecklistUl(ul, doc);
  });

  return doc.body.innerHTML;
}
