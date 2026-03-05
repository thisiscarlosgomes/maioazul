#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List

from pypdf import PdfReader


TITLE_RE = re.compile(r"^\s*T[IÍ]TULO\s+([IVXLC0-9]+)\b.*$", re.IGNORECASE)
CHAPTER_RE = re.compile(r"^\s*CAP[IÍ]TULO\s+([IVXLC0-9]+)\b.*$", re.IGNORECASE)
SECTION_RE = re.compile(r"^\s*SEC[CÇ][AÃ]O\s+([IVXLC0-9]+)\b.*$", re.IGNORECASE)
ARTICLE_RE = re.compile(r"^\s*ARTIGO\s+(\d+)\s*[.\-ºo°]*\s*(.*)$", re.IGNORECASE)
NOISE_LINE_PATTERNS = [
    re.compile(r".*\bS[ÉE]RIE\s*\|\s*n[ºo]\b.*", re.IGNORECASE),
    re.compile(r"^[A-Z0-9]+/[A-Z0-9]+/[A-Z0-9]+/\d+\s*\|.*$", re.IGNORECASE),
]


@dataclass
class Block:
    kind: str
    heading: str | None
    article_number: int | None
    title: str | None
    chapter: str | None
    section: str | None
    page_start: int
    page_end: int
    text: str


def normalize_page_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    lines = []
    for raw in text.splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if line and not any(p.match(line) for p in NOISE_LINE_PATTERNS):
            lines.append(line)
    return "\n".join(lines)


def split_with_overlap(text: str, max_chars: int = 4200, overlap: int = 500) -> List[str]:
    if len(text) <= max_chars:
        return [text]
    parts: List[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            back = text.rfind("\n", start, end)
            if back > start + int(max_chars * 0.6):
                end = back
        chunk = text[start:end].strip()
        if chunk:
            parts.append(chunk)
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return parts


def extract_blocks(pages: List[str]) -> List[Block]:
    blocks: List[Block] = []
    current_title: str | None = None
    current_chapter: str | None = None
    current_section: str | None = None
    current_article_no: int | None = None
    current_article_heading: str | None = None
    buffer: List[str] = []
    block_start_page = 1
    block_kind = "preamble"

    def flush(end_page: int) -> None:
        nonlocal buffer, block_start_page, block_kind, current_article_no, current_article_heading
        text = "\n".join(buffer).strip()
        if not text:
            return
        blocks.append(
            Block(
                kind=block_kind,
                heading=current_article_heading,
                article_number=current_article_no,
                title=current_title,
                chapter=current_chapter,
                section=current_section,
                page_start=block_start_page,
                page_end=end_page,
                text=text,
            )
        )
        buffer = []

    for page_num, page_text in enumerate(pages, start=1):
        for line in page_text.splitlines():
            title_match = TITLE_RE.match(line)
            chapter_match = CHAPTER_RE.match(line)
            section_match = SECTION_RE.match(line)
            article_match = ARTICLE_RE.match(line)

            if title_match:
                current_title = line
            elif chapter_match:
                current_chapter = line
            elif section_match:
                current_section = line

            if article_match:
                flush(page_num)
                current_article_no = int(article_match.group(1))
                article_tail = article_match.group(2).strip()
                current_article_heading = f"Artigo {current_article_no}"
                if article_tail:
                    current_article_heading = f"{current_article_heading} - {article_tail}"
                block_kind = "article"
                block_start_page = page_num
                buffer = [line]
            else:
                if not buffer:
                    block_kind = "preamble" if current_article_no is None else "continuation"
                    block_start_page = page_num
                buffer.append(line)
        if buffer:
            buffer.append("")

    flush(len(pages))
    return blocks


def slugify(name: str) -> str:
    lower = name.lower()
    lower = re.sub(r"[^a-z0-9]+", "-", lower)
    lower = re.sub(r"-+", "-", lower).strip("-")
    return lower or "document"


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract and chunk legal PDF content for MCP ingestion.")
    parser.add_argument("--pdf", required=True, help="Absolute path to source PDF")
    parser.add_argument("--out-dir", required=True, help="Output directory")
    parser.add_argument("--doc-id", default=None, help="Optional document id slug")
    parser.add_argument("--language", default="pt", help="Language tag")
    args = parser.parse_args()

    pdf_path = Path(args.pdf).expanduser().resolve()
    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    out_dir = Path(args.out_dir).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    doc_id = args.doc_id or slugify(pdf_path.stem)
    raw_md_path = out_dir / "raw.md"
    chunks_path = out_dir / "chunks.jsonl"

    reader = PdfReader(str(pdf_path))
    page_texts = [normalize_page_text(page.extract_text() or "") for page in reader.pages]

    raw_parts = [f"# {pdf_path.stem}", "", f"- source_pdf: {pdf_path}", f"- pages: {len(page_texts)}", ""]
    for i, txt in enumerate(page_texts, start=1):
        raw_parts.append(f"## Page {i}")
        raw_parts.append("")
        raw_parts.append(txt)
        raw_parts.append("")
    raw_md_path.write_text("\n".join(raw_parts), encoding="utf-8")

    blocks = extract_blocks(page_texts)

    records = []
    chunk_seq = 0
    for block in blocks:
        subchunks = split_with_overlap(block.text, max_chars=4200, overlap=500)
        for part_idx, chunk_text in enumerate(subchunks, start=1):
            chunk_seq += 1
            records.append(
                {
                    "id": f"{doc_id}-{chunk_seq:04d}",
                    "doc_id": doc_id,
                    "source_pdf": str(pdf_path),
                    "language": args.language,
                    "block_kind": block.kind,
                    "part_index": part_idx,
                    "parts_total": len(subchunks),
                    "page_start": block.page_start,
                    "page_end": block.page_end,
                    "title": block.title,
                    "chapter": block.chapter,
                    "section": block.section,
                    "article_heading": block.heading,
                    "article_number": block.article_number,
                    "char_count": len(chunk_text),
                    "text": chunk_text,
                }
            )

    with chunks_path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(json.dumps({"ok": True, "doc_id": doc_id, "pages": len(page_texts), "chunks": len(records), "out_dir": str(out_dir)}))


if __name__ == "__main__":
    main()
