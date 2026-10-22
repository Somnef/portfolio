/**
 * A minimal, deterministic zip writer: deflated files, fixed timestamps and
 * permissions, entries in name order. The same inputs always give the same
 * bytes, so the archive's hash changes only when the code does - which is
 * what Terraform compares to decide whether the Lambda needs an update.
 *
 * Off-the-shelf zip tools embed file times, and the zip CLI also the owner's
 * uid/gid; either would make every CI build look like a change.
 */
import { crc32, deflateRawSync } from 'node:zlib';

// 1980-01-01 00:00, the earliest time a zip can express, as MS-DOS time/date.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
// Made by Unix (3), spec 2.0 - so the external attributes below are read
// as Unix mode bits: a regular file, rw-r--r--.
const VERSION_MADE_BY = (3 << 8) | 20;
const VERSION_NEEDED = 20;
const EXTERNAL_ATTRS = (0o100644 << 16) >>> 0;

/** @param {Record<string, Buffer>} files name -> contents */
export function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const name of Object.keys(files).sort()) {
    const data = files[name];
    const nameBytes = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION_NEEDED, 4);
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra length

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(VERSION_MADE_BY, 4);
    central.writeUInt16LE(VERSION_NEEDED, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    // extra, comment, disk number, internal attributes: all zero
    central.writeUInt32LE(EXTERNAL_ATTRS, 38);
    central.writeUInt32LE(offset, 42);

    locals.push(local, nameBytes, compressed);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const count = Object.keys(files).length;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralDirectory, end]);
}
