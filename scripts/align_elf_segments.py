#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Align ELF LOAD segments to 16KB (16384 bytes) for Android 15+ compatibility.
This script modifies the p_align field in ELF program headers in-place.

Usage:
    python3 align_elf_segments.py <path_to_so_file>

Cross-platform notes:
    - Emoji characters (like checkmarks/crosses) are intentionally avoided to
      prevent UnicodeEncodeError on Windows consoles with non-UTF-8 codepages.
    - stdout is reconfigured to UTF-8 with error replacement as a safety net.
"""

import sys
import struct
import os

# Reconfigure stdout to UTF-8 with 'replace' error handling so the script
# never crashes due to console encoding issues (e.g. Windows cp1252 / cp850).
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


def align_elf_load_segments(filepath, page_size=16384):
    """
    Align all LOAD segments in an ELF (.so) file to the given page size.

    Modifies the p_align field in each PT_LOAD program header in-place.
    Handles both 32-bit and 64-bit ELF files using little-endian byte order
    (standard for Android/ARM and Android/x86 targets).

    Args:
        filepath  : Path to the ELF (.so) file to patch.
        page_size : Target page alignment in bytes (default: 16384 = 16KB).

    Returns:
        True if the file was processed successfully (modified or already aligned).
        False if the file could not be processed (not an ELF, I/O error, etc.).
    """
    try:
        with open(filepath, 'r+b') as f:
            # ── Read ELF header (first 64 bytes covers both 32-bit and 64-bit) ──
            elf_header = f.read(64)

            # Validate ELF magic number
            if len(elf_header) < 16 or elf_header[:4] != b'\x7fELF':
                print("[16KB] SKIP  {} (not an ELF file)".format(
                    os.path.basename(filepath)))
                return False

            # EI_CLASS: 1 = 32-bit, 2 = 64-bit
            ei_class = elf_header[4]
            is_64bit = (ei_class == 2)

            # EI_DATA: 1 = little-endian, 2 = big-endian
            ei_data = elf_header[5]
            endian = '<' if ei_data == 1 else '>'

            if is_64bit:
                # 64-bit ELF program header table info
                # e_phoff     : offset 32, 8 bytes (uint64)
                # e_phentsize : offset 54, 2 bytes (uint16)
                # e_phnum     : offset 56, 2 bytes (uint16)
                e_phoff     = struct.unpack(endian + 'Q', elf_header[32:40])[0]
                e_phentsize = struct.unpack(endian + 'H', elf_header[54:56])[0]
                e_phnum     = struct.unpack(endian + 'H', elf_header[56:58])[0]

                # p_align is at offset 48 within each 64-bit program header (uint64)
                p_align_offset = 48
                p_align_fmt    = endian + 'Q'
                p_align_size   = 8
            else:
                # 32-bit ELF program header table info
                # e_phoff     : offset 28, 4 bytes (uint32)
                # e_phentsize : offset 42, 2 bytes (uint16)
                # e_phnum     : offset 44, 2 bytes (uint16)
                e_phoff     = struct.unpack(endian + 'I', elf_header[28:32])[0]
                e_phentsize = struct.unpack(endian + 'H', elf_header[42:44])[0]
                e_phnum     = struct.unpack(endian + 'H', elf_header[44:46])[0]

                # p_align is at offset 28 within each 32-bit program header (uint32)
                p_align_offset = 28
                p_align_fmt    = endian + 'I'
                p_align_size   = 4

            modified = False
            PT_LOAD  = 1  # ELF segment type: loadable segment

            # ── Iterate over all program headers ──────────────────────────────
            for i in range(e_phnum):
                ph_start = e_phoff + (i * e_phentsize)
                f.seek(ph_start)

                p_type_bytes = f.read(4)
                if len(p_type_bytes) < 4:
                    break
                p_type = struct.unpack(endian + 'I', p_type_bytes)[0]

                if p_type == PT_LOAD:
                    # Read current p_align
                    f.seek(ph_start + p_align_offset)
                    current_align_bytes = f.read(p_align_size)
                    if len(current_align_bytes) < p_align_size:
                        continue
                    current_align = struct.unpack(p_align_fmt, current_align_bytes)[0]

                    if current_align != page_size:
                        # Patch p_align to the target page size
                        f.seek(ph_start + p_align_offset)
                        f.write(struct.pack(p_align_fmt, page_size))
                        modified = True

            if modified:
                print("[16KB] ALIGNED {}".format(os.path.basename(filepath)))
            # If not modified, the file was already aligned — no output needed (keeps
            # build output concise; Gradle will print a summary count).

            return True

    except OSError as e:
        print("[16KB] ERROR  {} : {}".format(os.path.basename(filepath), e))
        return False
    except struct.error as e:
        print("[16KB] ERROR  {} : malformed ELF header ({})".format(
            os.path.basename(filepath), e))
        return False
    except Exception as e:
        print("[16KB] ERROR  {} : {}".format(os.path.basename(filepath), e))
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 align_elf_segments.py <path_to_so_file>")
        sys.exit(1)

    filepath = sys.argv[1]

    if not os.path.exists(filepath):
        print("[16KB] ERROR  File not found: {}".format(filepath))
        sys.exit(1)

    success = align_elf_load_segments(filepath)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
