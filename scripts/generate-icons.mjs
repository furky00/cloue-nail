import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

function crc32(buf) {
  let crc = 0xffffffff
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // bit depth 8, RGB

  // Pixel data: draw Cloué Nail icon
  // Background: #2D3B6B (navy), center circle: #E8185A (pink), letter C in white
  const [bgR, bgG, bgB] = [0x2D, 0x3B, 0x6B]
  const [acR, acG, acB] = [0xE8, 0x18, 0x5A]
  const cx = size / 2, cy = size / 2, radius = size * 0.38

  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0 // filter none
    for (let x = 0; x < size; x++) {
      const i = y * (1 + size * 3) + 1 + x * 3
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Rounded rectangle background (corner radius = 22% of size)
      const cornerR = size * 0.22
      const rx = Math.abs(x - cx) - (size / 2 - cornerR)
      const ry = Math.abs(y - cy) - (size / 2 - cornerR)
      const inRoundedRect = (rx <= 0 || ry <= 0)
        ? (Math.abs(x - cx) < size / 2 && Math.abs(y - cy) < size / 2)
        : (rx * rx + ry * ry < cornerR * cornerR)

      if (!inRoundedRect) {
        raw[i] = 255; raw[i+1] = 255; raw[i+2] = 255 // transparent → white bg for PNG
        continue
      }

      if (dist < radius) {
        // Pink circle
        raw[i] = acR; raw[i+1] = acG; raw[i+2] = acB
      } else {
        // Navy background
        raw[i] = bgR; raw[i+1] = bgG; raw[i+2] = bgB
      }

      // Draw "C" letter in white inside circle
      // C is centered at cx, cy — arc from ~30° to ~330° of a circle
      const innerR = radius * 0.55, outerR = radius * 0.80
      const angle = Math.atan2(dy, dx) * 180 / Math.PI // -180 to 180
      const normAngle = (angle + 360) % 360 // 0-360
      const inRing = dist >= innerR && dist <= outerR
      const inCArc = normAngle > 40 && normAngle < 320 // opening on right side
      if (inRing && inCArc && dist < radius * 0.95) {
        raw[i] = 255; raw[i+1] = 255; raw[i+2] = 255
      }
    }
  }

  const idat = chunk('IDAT', deflateSync(raw))
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', createPNG(192))
writeFileSync('public/icon-512.png', createPNG(512))
writeFileSync('public/apple-touch-icon.png', createPNG(180))
console.log('✅ Icons generated: public/icon-192.png, icon-512.png, apple-touch-icon.png')
