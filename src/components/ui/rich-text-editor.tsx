"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
import {
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatUnderline,
  mdiFormatStrikethrough,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatParagraph,
  mdiChevronDown,
  mdiCodeBraces,
  mdiLink,
  mdiUndo,
  mdiRedo,
  mdiImagePlus,
  mdiMinus,
  mdiFormatColorText,
} from "@mdi/js";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
] as const;

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  minHeight?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter description…",
  id,
  className,
  minHeight = "5rem",
}: RichTextEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const savedLinkSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const savedBlockSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder }),
        Image.configure({ inline: false, allowBase64: true }),
        TextStyle,
        Color,
      ],
      content: value || "",
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
      editorProps: {
        attributes: {
          "data-placeholder": placeholder,
          class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-w-0",
        },
        handleDrop: (view, event) => {
          const files = event.dataTransfer?.files;
          if (!files?.length) return false;
          const file = files[0];
          if (!file.type.startsWith("image/")) return false;
          event.preventDefault();
          const ed = editorRef.current;
          if (!ed) return true;
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          readFileAsDataUrl(file).then((src) => {
            if (pos) {
              ed.chain().focus().insertContentAt(pos.pos, { type: "image", attrs: { src } }).run();
            } else {
              ed.chain().focus().setImage({ src }).run();
            }
          });
          return true;
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                const ed = editorRef.current;
                if (!ed) return true;
                readFileAsDataUrl(file).then((src) => {
                  ed.chain().focus().setImage({ src }).run();
                });
                return true;
              }
            }
          }
          return false;
        },
      },
    },
    [],
  );

  useEffect(() => {
    editorRef.current = editor ?? null;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  // Sync when value is cleared from outside (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    const trimmed = (value ?? "").trim();
    const current = editor.getHTML();
    const emptyHtml = "<p></p>";
    if (trimmed === "" && current !== emptyHtml) {
      editor.commands.setContent("", { emitUpdate: false });
    }
  }, [value, editor]);

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && id) el.setAttribute("id", id);
    },
    [id],
  );

  // Only for dropdown items (menu closes first). Must be before early return (Rules of Hooks).
  const runAfterTick = useCallback((fn: () => void) => {
    setTimeout(fn, 0);
  }, []);

  const [urlDialog, setUrlDialog] = useState<"link" | null>(null);
  const [urlInput, setUrlInput] = useState("");

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    savedLinkSelectionRef.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    setUrlInput(editor.isActive("link") ? (editor.getAttributes("link").href ?? "") : "");
    setUrlDialog("link");
  }, [editor]);

  const submitUrlDialog = useCallback(() => {
    if (!editor || urlDialog !== "link") return;
    const url = urlInput.trim();
    if (!url) {
      setUrlDialog(null);
      setUrlInput("");
      return;
    }
    const sel = savedLinkSelectionRef.current;
    runAfterTick(() => {
      if (sel) {
        editor.commands.setTextSelection(sel);
      }
      editor.chain().focus().setLink({ href: url }).run();
      savedLinkSelectionRef.current = null;
    });
    setUrlDialog(null);
    setUrlInput("");
  }, [editor, urlDialog, urlInput, runAfterTick]);

  const onImageFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file?.type.startsWith("image/") || !editor) return;
      readFileAsDataUrl(file).then((src) => {
        editor.chain().focus().setImage({ src }).run();
      });
      e.target.value = "";
    },
    [editor],
  );

  if (!editor) {
    return (
      <div
        className={cn(
          "border-input bg-white dark:bg-input/30 rounded-md border px-3 py-2 min-w-0",
          className,
        )}
        style={{ minHeight }}
      >
        <div className="text-muted-foreground text-sm">{placeholder}</div>
      </div>
    );
  }

  return (
    <div
      ref={setRef}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-within:border-primary focus-within:ring-primary rounded-md border transition-[color] outline-none focus-within:ring-1 min-w-0 bg-white dark:bg-input/30 overflow-hidden",
        className,
      )}
      style={{ minHeight }}
    >
      {/* Toolbar – use onMouseDown so editor keeps focus (fixes list/format buttons) */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/30 px-1 py-1">
        {/* Text style / Headings */}
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              savedBlockSelectionRef.current = { from: editor.state.selection.from, to: editor.state.selection.to };
            } else {
              savedBlockSelectionRef.current = null;
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              colorScheme="neutral"
              className="h-8 gap-1 px-2 text-gray-600! [&_svg]:size-4 [&_svg]:text-gray-600!"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Icon path={mdiFormatParagraph} size="sm" />
              <Icon path={mdiChevronDown} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().setParagraph().run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Paragraph
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().setHorizontalRule().run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Horizontal rule
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text styles dropdown (Bold, Italic, etc.) */}
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              savedBlockSelectionRef.current = { from: editor.state.selection.from, to: editor.state.selection.to };
            } else {
              savedBlockSelectionRef.current = null;
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              colorScheme="neutral"
              className="h-8 gap-1 px-2 text-gray-600! [&_svg]:size-4 [&_svg]:text-gray-600!"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Icon path={mdiFormatBold} size="sm" />
              <Icon path={mdiChevronDown} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().toggleBold().run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Bold
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().toggleItalic().run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Italic
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().toggleUnderline().run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Underline
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  editor.chain().focus().toggleStrike().run();
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Strikethrough
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* List types dropdown */}
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              savedBlockSelectionRef.current = { from: editor.state.selection.from, to: editor.state.selection.to };
            } else {
              savedBlockSelectionRef.current = null;
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              colorScheme="neutral"
              className="h-8 gap-1 px-2 text-gray-600! [&_svg]:size-4 [&_svg]:text-gray-600!"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Icon path={mdiFormatListBulleted} size="sm" />
              <Icon path={mdiChevronDown} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  requestAnimationFrame(() => {
                    editor.view.dom.focus();
                    editor.commands.toggleList("bulletList", "listItem");
                  });
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Bulleted list
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(e) => {
                e.preventDefault();
                runAfterTick(() => {
                  const sel = savedBlockSelectionRef.current;
                  if (sel) editor.commands.setTextSelection(sel);
                  requestAnimationFrame(() => {
                    editor.view.dom.focus();
                    editor.commands.toggleList("orderedList", "listItem");
                  });
                });
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Numbered list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              colorScheme="neutral"
              className="h-8 w-8 p-0 text-gray-600! [&_svg]:size-4 [&_svg]:text-gray-600!"
              onMouseDown={(e) => e.preventDefault()}
              title="Text color"
            >
              <Icon path={mdiFormatColorText} size="sm" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="grid grid-cols-4 gap-1">
              {TEXT_COLORS.map(({ name, value }) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  className="size-8 rounded-md border border-border hover:ring-2 hover:ring-primary/50"
                  style={value ? { backgroundColor: value } : { backgroundColor: "var(--color-foreground)" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (value) {
                      editor.chain().focus().setColor(value).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
        <ToolbarButton
          onMouseDown={() => {
            requestAnimationFrame(() => {
              editor.view.dom.focus();
              editor.commands.toggleCode();
            });
          }}
          isActive={editor.isActive("code")}
          title="Code snippet"
          icon={mdiCodeBraces}
        />
        <ToolbarButton
          onMouseDown={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              openLinkDialog();
            }
          }}
          isActive={editor.isActive("link")}
          title="Link"
          icon={mdiLink}
        />
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={onImageFileSelect}
          />
          <ToolbarButton
            onMouseDown={() => imageInputRef.current?.click()}
            title="Insert image (upload or drag and drop)"
            icon={mdiImagePlus}
          />
        </>

        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
        <ToolbarButton
          onMouseDown={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          icon={mdiUndo}
        />
        <ToolbarButton
          onMouseDown={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          icon={mdiRedo}
        />
      </div>
      {/* Content area */}
      <div
        className={cn(
          "px-3 py-2",
          "[&_.tiptap]:min-h-12 [&_.tiptap]:py-0 [&_.tiptap]:text-sm",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.tiptap_img]:max-w-full [&_.tiptap_img]:h-auto [&_.tiptap_img]:rounded",
          // Link styling so linked text is visibly formatted
          "[&_.tiptap_a]:text-primary [&_.tiptap_a]:underline [&_.tiptap_a]:cursor-pointer [&_.tiptap_a]:hover:opacity-90",
          // Heading sizes (prose may not apply inside editor without these)
          "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mt-4 [&_.tiptap_h1]:mb-2",
          "[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:mt-3 [&_.tiptap_h2]:mb-2",
          "[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mt-2 [&_.tiptap_h3]:mb-1",
          // List styling so bullets/numbers are visible
          "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:my-2",
          "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:my-2",
          "[&_.tiptap_li]:my-0.5",
          // Inline code and code block
          "[&_.tiptap_code]:bg-muted [&_.tiptap_code]:px-1 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:rounded [&_.tiptap_code]:text-sm [&_.tiptap_code]:font-mono",
          "[&_.tiptap_pre]:bg-muted [&_.tiptap_pre]:p-3 [&_.tiptap_pre]:rounded-md [&_.tiptap_pre]:overflow-x-auto [&_.tiptap_pre]:my-2 [&_.tiptap_pre]:text-sm [&_.tiptap_pre]:font-mono",
        )}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Link URL dialog */}
      <Dialog open={urlDialog !== null} onOpenChange={(open) => { if (!open) { setUrlDialog(null); setUrlInput(""); savedLinkSelectionRef.current = null; } }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="url-input">URL</Label>
            <Input
              id="url-input"
              type="url"
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitUrlDialog();
                }
                if (e.key === "Escape") {
                  setUrlDialog(null);
                  setUrlInput("");
                  savedLinkSelectionRef.current = null;
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" colorScheme="neutral" onClick={() => { setUrlDialog(null); setUrlInput(""); savedLinkSelectionRef.current = null; }}>
              Cancel
            </Button>
            <Button type="button" colorScheme="primary" onClick={submitUrlDialog}>
              Add link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarButton({
  onMouseDown,
  isActive,
  disabled,
  title,
  icon,
}: {
  onMouseDown: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  icon: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      colorScheme="neutral"
      className={cn(
        "h-8 w-8 p-0 [&_svg]:size-4 text-gray-600! [&_svg]:text-gray-600!",
        isActive && "bg-muted text-gray-900! [&_svg]:text-gray-900!",
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onMouseDown();
      }}
      disabled={disabled}
      title={title}
      aria-pressed={isActive}
    >
      <Icon path={icon} size="sm" />
    </Button>
  );
}
